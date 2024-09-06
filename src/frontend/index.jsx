import React, { useEffect, useState } from "react";
import ForgeReconciler, {
  Text,
  Select,
  Button,
  Stack,
  DynamicTable,
  Tabs, Tab, TabList, TabPanel,
  TextArea,
  SectionMessage,
  Box,
  Heading,
  Inline
} from "@forge/react";
import { invoke } from "@forge/bridge";
import api from "@forge/api";

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
  const decodedJql = decodeHtmlEntities(jql);
  const response = await invoke('getIssuesByJQL', { jql: decodedJql });
  return response;
};

const saveUserPreferences = async (project, board, sprint, jql, option) => {
  await api.user.storage.set('userPreferences', { project, board, sprint, jql, option });
};

const getUserPreferences = async () => {
  return await api.user.storage.get('userPreferences');
};

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

const calculateWorkingDays = (startDate, endDate) => {
  let count = 0;
  const currentDate = new Date(startDate);
  while (currentDate <= new Date(endDate)) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sundays and Saturdays
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return count;
};

const App = () => {
  const [projects, setProjects] = useState([]);
  const [boards, setBoards] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [totalWorkingHours, setTotalWorkingHours] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [jql, setJql] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    // Load saved preferences if they exist
    const loadUserPreferences = async () => {
      const preferences = await getUserPreferences();
      if (preferences) {
        setSelectedTab(preferences.option === 'jql' ? 1 : 0);
        setSelectedProject(preferences.project);
        setSelectedBoard(preferences.board);
        setSelectedSprint(preferences.sprint);
        setJql(preferences.jql);
      }
    };
    loadUserPreferences();

    // Load projects
    const loadProjects = async () => {
      const fetchedProjects = await fetchProjects();
      setProjects(fetchedProjects);
    };
    loadProjects();
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

  const handleSubmit = async () => {
    let issues;
    let sprintDetails;

    if (selectedTab === 0 && selectedProject && selectedSprint) {
      sprintDetails = await invoke('getSprintDetails', { sprintId: selectedSprint.value });
      const workingDays = calculateWorkingDays(sprintDetails.startDate, sprintDetails.endDate);
      const workingHours = workingDays * 7; // 7 working hours per day
      setTotalWorkingHours(workingHours);

      issues = await invoke('getSprintData', { projectId: selectedProject.value, sprintId: selectedSprint.value });
    } else {
      issues = await fetchIssuesByJQL(jql);
    }

    const calculatedMetrics = calculateMetrics(issues, totalWorkingHours);
    setMetrics(calculatedMetrics);
    setLastRefreshTime(new Date().toLocaleString());

    // Save the user preferences
    await saveUserPreferences(selectedProject, selectedBoard, selectedSprint, jql, selectedTab === 0 ? 'project' : 'jql');
  };

  return (
    <Stack space="space.300">
      <Tabs id="performance-tabs" onChange={setSelectedTab} selected={selectedTab}>
        <TabList>
          <Tab>Project/Board/Sprint</Tab>
          <Tab>JQL Query</Tab>
        </TabList>
      </Tabs>

      {/* Adding space between Tabs and the Select Inputs */}
      <Box padding="space.200" />

      <Stack space="space.200">
        {/* Display all filters at once */}
        <Select
          placeholder="Select Project"
          options={projects}
          value={selectedProject}
          onChange={(value) => setSelectedProject(value)}
        />

        <Select
          placeholder="Select Board"
          options={boards}
          value={selectedBoard}
          onChange={(value) => setSelectedBoard(value)}
          isDisabled={!selectedProject} // Disable Board Select if no project is selected
        />

        <Select
          placeholder="Select Sprint"
          options={sprints}
          value={selectedSprint}
          onChange={(value) => setSelectedSprint(value)}
          isDisabled={!selectedBoard} // Disable Sprint Select if no board is selected
        />

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

        <Button appearance="primary" onClick={handleSubmit}>
          Generate Report
        </Button>
      </Stack>

      {totalWorkingHours && (
        <Heading as="h5">Total Working Hours in Sprint: {totalWorkingHours}</Heading>
      )}

      {metrics && (
        <DynamicTable
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
          rows={Object.keys(metrics).map(developer => ({
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
          }))}
        />
      )}

      {lastRefreshTime && (
        <Heading as="h6">Last Refresh Time: {lastRefreshTime}</Heading>
      )}
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);