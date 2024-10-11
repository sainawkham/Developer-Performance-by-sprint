import React, { useEffect, useState } from "react";
import ForgeReconciler, {
  Heading,
  Text,
  Select,
  Button,
  Stack,
  DynamicTable,
  Tabs,
  Tab,
  TabList,
  TextArea,
  SectionMessage,
  Modal,
  ModalBody,
  ModalTransition,
  ModalTitle,
  ModalFooter,
  ModalHeader,
  Inline,
} from "@forge/react";
import { invoke } from "@forge/bridge";

const fetchProjects = async () => {
  const response = await invoke('getProjects');
  return response.map(project => ({ label: project.name, value: project.id, key: project.key }));
};

const fetchBoards = async (projectId) => {
  const response = await invoke('getBoards', { projectId });
  return response.map(board => ({ label: board.name, value: board.id }));
};

const fetchSprints = async (boardId) => {
  const response = await invoke('getSprints', { boardId });
  return response.map(sprint => ({ label: sprint.name, value: sprint.id }));
};

const fetchIssuesByJQL = async (jql) => {
  const response = await invoke('getIssuesByJQL', { jql });
  return Array.isArray(response) ? response : [];
};

// Save user preferences
const saveUserPreferences = async (project, board, sprint, jql, googleSheetLink, option) => {
  console.log('Saving user preferences:', { project, board, sprint, jql, googleSheetLink, option });
  await invoke('saveUserPreferences', { project, board, sprint, jql, googleSheetLink, option });
  console.log('Preferences saved successfully.');
};

// Get user preferences
const getUserPreferences = async () => {
  const preferences = await invoke('getUserPreferences');
  console.log('Retrieved user preferences:', preferences);
  return preferences;
};

// Format date to DD/MM/YYYY
const formatDate = (dateString) => {
  if (!dateString) return 'undefined';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'undefined';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Parse date from DD/MM/YYYY format
const parseDate = (dateString) => {
  const [day, month, year] = dateString.split('/');
  if (day && month && year) {
    return new Date(`${year}-${month}-${day}`);
  }
  return new Date(NaN); // Return an invalid date if the format is incorrect
};

const calculateWorkingDays = (startDate, endDate, nonWorkingDays) => {
  let count = 0;
  const currentDate = new Date(startDate);

  // Convert non-working days to Date objects and filter out any invalid dates
  const formattedNonWorkingDays = nonWorkingDays
    .map(day => {
      const parsedDate = parseDate(day);
      return parsedDate.toString() !== "Invalid Date" ? parsedDate.toDateString() : null;
    })
    .filter(date => date !== null);

  console.log("Formatted Non-Working Days:", formattedNonWorkingDays);

  while (currentDate <= new Date(endDate)) {
    const currentDateString = currentDate.toDateString();
    if (!formattedNonWorkingDays.includes(currentDateString)) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return count;
};

// Calculate metrics based on issues and total working hours
const calculateMetrics = (issues, totalWorkingHours) => {
  const metrics = {};
  issues.forEach(issue => {
    const developer = issue.fields.assignee?.displayName || 'Unassigned';

    if (!metrics[developer]) {
      metrics[developer] = {
        totalEstimatedTime: 0,
        totalTimeSpent: 0,
        outstandingTime: 0,
        numberOfTasksCompleted: 0,
        totalCycleTime: 0,
        numberOfDefects: 0,
      };
    }

    const estimate = issue.fields.timeoriginalestimate || 0;
    const timeSpent = issue.fields.timespent || 0;
    const cycleTime = issue.fields.resolutiondate ? 
      new Date(issue.fields.resolutiondate).getTime() - new Date(issue.fields.created).getTime() : 0;
    const isDefect = issue.fields.issuetype.name === 'Bug';

    metrics[developer].totalEstimatedTime += estimate / 3600; // Convert seconds to hours
    metrics[developer].totalTimeSpent += timeSpent / 3600; // Convert seconds to hours
    metrics[developer].outstandingTime += (estimate - timeSpent) / 3600; // Convert seconds to hours
    metrics[developer].numberOfTasksCompleted += issue.fields.status.name === 'Done' ? 1 : 0;
    metrics[developer].totalCycleTime += cycleTime / (1000 * 3600); // Convert milliseconds to hours
    metrics[developer].numberOfDefects += isDefect ? 1 : 0;
  });

  for (const developer in metrics) {
    metrics[developer].averageCycleTime = metrics[developer].numberOfTasksCompleted > 0 ? 
      metrics[developer].totalCycleTime / metrics[developer].numberOfTasksCompleted : 0;
    metrics[developer].workloadDifference = metrics[developer].totalTimeSpent - totalWorkingHours;
    metrics[developer].workloadCompliance = metrics[developer].totalEstimatedTime - totalWorkingHours;
  }

  return metrics;
};

const App = () => {
  const [projects, setProjects] = useState([]);
  const [boards, setBoards] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [sprintDetails, setSprintDetails] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [totalWorkingHours, setTotalWorkingHours] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [jql, setJql] = useState('');
  const [googleSheetLink, setGoogleSheetLink] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadUserPreferences = async () => {
      const projects = await fetchProjects();
      setProjects(projects);

      const preferences = await getUserPreferences();
      if (preferences && preferences.project && preferences.sprint) {
        setSelectedProject(preferences.project);
        setSelectedBoard(preferences.board);
        setSelectedSprint(preferences.sprint);
        setJql(preferences.jql);
        setGoogleSheetLink(preferences.googleSheetLink || '');
        setSelectedTab(preferences.option === 'jql' ? 1 : 0);

        // Load sprint details when preference exists
        const fetchedSprintDetails = await invoke('getSprintDetails', { sprintId: preferences.sprint.value });
        setSprintDetails(fetchedSprintDetails);
      }
    };
    loadUserPreferences();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      const loadBoards = async () => {
        const fetchedBoards = await fetchBoards(selectedProject.value);
        setBoards(fetchedBoards);
      };
      loadBoards();
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedBoard) {
      const loadSprints = async () => {
        const fetchedSprints = await fetchSprints(selectedBoard.value);
        setSprints(fetchedSprints);
      };
      loadSprints();
    }
  }, [selectedBoard]);

  useEffect(() => {
    if (selectedSprint) {
      const loadSprintDetails = async () => {
        const fetchedSprintDetails = await invoke('getSprintDetails', { sprintId: selectedSprint.value });
        setSprintDetails(fetchedSprintDetails);
      };
      loadSprintDetails();
    }
  }, [selectedSprint]);

  const generateReport = async () => {
    if (!selectedProject || !selectedBoard || !selectedSprint) {
      return;
    }

    setIsLoading(true);
    setIsModalOpen(false);

    let issues = [];

    if (selectedProject && selectedSprint) {
      // Get non-working days from Google Sheets
      const nonWorkingDays = await invoke('getNonWorkingDays', { googleSheetLink });
      const workingDays = calculateWorkingDays(sprintDetails.startDate, sprintDetails.endDate, nonWorkingDays);
      const workingHours = workingDays * 7; // 7 working hours per day
      setTotalWorkingHours(workingHours);

      issues = await invoke('getSprintData', { projectId: selectedProject.value, sprintId: selectedSprint.value });
    } else if (jql && googleSheetLink) {
      issues = await fetchIssuesByJQL(jql);
      // Set a default totalWorkingHours value if no sprint details available.
      setTotalWorkingHours(0);
    }

    if (!Array.isArray(issues)) {
      issues = [];
    }

    const calculatedMetrics = calculateMetrics(issues, totalWorkingHours);
    setMetrics(calculatedMetrics);
    setLastRefreshTime(new Date().toLocaleString());
    setIsLoading(false);

    await saveUserPreferences(selectedProject, selectedBoard, selectedSprint, jql, googleSheetLink, selectedTab === 0 ? 'project' : 'jql');
  };

  return (
    <Stack space="space.300">
      <Inline space="space.200"  alignInline="end">
        <Button
          appearance="primary"
          onClick={generateReport}
        >
          Generate Report
        </Button>
        <Button
          appearance="subtle"
          iconBefore="settings"
          onClick={() => setIsModalOpen(true)}
        />
      </Inline>

      {!selectedProject && (
        <SectionMessage appearance="warning">
          Please select a project, board, sprint, and add the Google Sheets link for non-working days to generate the report.
        </SectionMessage>
      )}

      <ModalTransition>
        {isModalOpen && (
          <Modal onClose={() => setIsModalOpen(false)}>
            <ModalHeader>
              <ModalTitle>Settings</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <Stack space="space.200" padding="space.200">
                <Tabs id="performance-tabs" onChange={setSelectedTab} selected={selectedTab}>
                  <TabList>
                    <Tab>Project/Board/Sprint</Tab>
                    <Tab>JQL Query</Tab>
                    <Tab>Non Working Days</Tab>
                  </TabList>
                </Tabs>

                {selectedTab === 0 && (
                  <Stack space="space.200">
                    <Select
                      placeholder="Select Project"
                      options={projects}
                      value={selectedProject}
                      onChange={(value) => setSelectedProject(value)}
                      spacing="compact"
                    />

                    <Select
                      placeholder="Select Board"
                      options={boards}
                      value={selectedBoard}
                      onChange={(value) => setSelectedBoard(value)}
                      isDisabled={!selectedProject}
                      spacing="compact"
                    />

                    <Select
                      placeholder="Select Sprint"
                      options={sprints}
                      value={selectedSprint}
                      onChange={(value) => setSelectedSprint(value)}
                      isDisabled={!selectedBoard}
                      spacing="compact"
                    />
                  </Stack>
                )}

                {selectedTab === 1 && (
                  <>
                    <TextArea
                      placeholder="Enter JQL"
                      value={jql}
                      onChange={(e) => setJql(e.target.value)}
                    />
                    <SectionMessage appearance="warning">
                      Your JQL query must include the project and sprint IDs.
                    </SectionMessage>
                  </>
                )}

                {selectedTab === 2 && (
                  <Stack space="space.200">
                    <TextArea
                      placeholder="Google Sheet Link for Non Working Days"
                      value={googleSheetLink}
                      onChange={(e) => setGoogleSheetLink(e.target.value)}
                      spacing="compact"
                    />
                    <SectionMessage appearance="information">
                      Provide a Google Sheet link that contains the non-working days in DD/MM/YYYY format.
                    </SectionMessage>
                  </Stack>
                )}
              </Stack>
            </ModalBody>
            <ModalFooter>
              <Inline space="space.200">
                <Button appearance="primary" onClick={generateReport}>
                  Generate Report
                </Button>
                <Button appearance="link" onClick={() => setIsModalOpen(false)}>
                  Close
                </Button>
              </Inline>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>

      {selectedProject && selectedSprint && sprintDetails && (
        <Stack space="space.100">
          <Heading as="h6">
            Project Name: {selectedProject.label}
          </Heading>
          <Heading as="h6">
            Sprint: {selectedSprint.label} ({formatDate(sprintDetails.startDate)} - {formatDate(sprintDetails.endDate)})
          </Heading>
          <Heading as="h6">
            Total Working Hours in Sprint: {totalWorkingHours}
          </Heading>
        </Stack>
      )}

      <DynamicTable
        isLoading={isLoading}
        head={{
          cells: [
            { key: 'developer', content: 'Developer Name' },
            { key: 'totalEstimatedTime', content: 'Total Estimated Time (hours)' },
            { key: 'totalTimeSpent', content: 'Total Time Spent (hours)' },
            { key: 'outstandingTime', content: 'Outstanding Time (hours)' },
            { key: 'workloadDifference', content: 'Workload Difference (hours)' },
            { key: 'workloadCompliance', content: 'Workload Compliance (hours)' },
            { key: 'numberOfTasksCompleted', content: 'Number of Tasks Completed' },
            { key: 'averageCycleTime', content: 'Average Cycle Time (hours)' },
            { key: 'numberOfDefects', content: 'Defects Assigned and Resolved' }
          ]
        }}
        rows={metrics ? Object.keys(metrics).map(developer => ({
          key: developer,
          cells: [
            { key: 'developer', content: developer },
            { key: 'totalEstimatedTime', content: metrics[developer].totalEstimatedTime.toFixed(2) },
            { key: 'totalTimeSpent', content: metrics[developer].totalTimeSpent.toFixed(2) },
            { key: 'outstandingTime', content: metrics[developer].outstandingTime.toFixed(2) },
            { key: 'workloadDifference', content: metrics[developer].workloadDifference.toFixed(2) },
            { key: 'workloadCompliance', content: metrics[developer].workloadCompliance.toFixed(2) },
            { key: 'numberOfTasksCompleted', content: metrics[developer].numberOfTasksCompleted },
            { key: 'averageCycleTime', content: metrics[developer].averageCycleTime.toFixed(2) },
            { key: 'numberOfDefects', content: metrics[developer].numberOfDefects }
          ]
        })) : []}
      />

      {lastRefreshTime && (
        <Text as="p">Last Refresh Time: {lastRefreshTime}</Text>
      )}
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
