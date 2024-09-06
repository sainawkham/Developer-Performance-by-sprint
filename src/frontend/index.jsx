import React, { useEffect, useState } from "react";
import ForgeReconciler, {
  Text,
  useProductContext,
  Select,
  Button,
  Stack,
  DynamicTable,
  Tabs, Tab, TabList, TabPanel,
  TextArea,
  SectionMessage,
  Box
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
  const decodedJql = decodeHtmlEntities(jql);
  const response = await invoke('getIssuesByJQL', { jql: decodedJql });
  return response;
};

const calculateMetrics = (issues) => {
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
    metrics[developer].workloadDifference = metrics[developer].totalTimeSpent - 40; // Example calculation
    metrics[developer].workloadCompliance = metrics[developer].totalEstimatedTime - 40; // Example calculation
  }

  return metrics;
};

const decodeHtmlEntities = (text) => {
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
};

const App = () => {
  const context = useProductContext();
  const [projects, setProjects] = useState([]);
  const [boards, setBoards] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [jql, setJql] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
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
    if (selectedTab === 0 && selectedProject && selectedSprint) {
      issues = await invoke('getSprintData', { projectId: selectedProject.value, sprintId: selectedSprint.value });
    } else {
      issues = await fetchIssuesByJQL(jql);
    }
    const calculatedMetrics = calculateMetrics(issues);
    setMetrics(calculatedMetrics);
  };

  return (
    <Stack space="space.300">
      <Tabs id="performance-tabs" onChange={setSelectedTab} selected={selectedTab}>
        <TabList>
          <Tab>Project/Board/Sprint</Tab>
          <Tab>JQL Query</Tab>
        </TabList>
      </Tabs>

      {/* Adding space between Tabs and Project/Board/Sprint */}
      <Box padding="space.200" />

      {selectedTab === 0 && (
        <Stack space="space.200">
          <Select
            placeholder="Select Project"
            options={projects}
            onChange={(value) => setSelectedProject(value)}
          />
          {selectedProject && (
            <Select
              placeholder="Select Board"
              options={boards}
              onChange={(value) => setSelectedBoard(value)}
            />
          )}
          {selectedBoard && (
            <Select
              placeholder="Select Sprint"
              options={sprints}
              onChange={(value) => setSelectedSprint(value)}
            />
          )}
        </Stack>
      )}

      {selectedTab === 1 && (
        <TextArea
          placeholder="Enter JQL"
          value={jql}
          onChange={(e) => setJql(e.target.value)}
        />
      )}

      {selectedTab === 1 && (
        <SectionMessage appearance="warning">
          Your JQL query must include the project and sprint IDs.
        </SectionMessage>
      )}

      <Box>
        {/* Button with normal width */}
        <Button appearance="primary" onClick={handleSubmit}>
          Generate Report
        </Button>
      </Box>

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
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
