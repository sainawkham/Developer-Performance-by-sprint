import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

let selectedProject = null;
let selectedSprint = null;

resolver.define('getProjects', async () => {
  const response = await api.asApp().requestJira(route/rest/api/3/project/search);
  const data = await response.json();
  return data.values;
});

resolver.define('getBoards', async (req) => {
  const response = await api.asApp().requestJira(route/rest/agile/1.0/board);
  const data = await response.json();  
  return data.values;
});

resolver.define('getSprints', async (req) => {
  const { boardId } = req.payload;
  const response = await api.asApp().requestJira(route/rest/agile/1.0/board/${boardId}/sprint);
  const data = await response.json();  
  console.log("getSprints data: ", data.values );
  return data.values;
});

resolver.define('getSprintData', async ({ payload }) => {
  const { projectId, sprintId } = payload;
  let startAt = 0;
  let maxResults = 50;
  let allIssues = [];

  // Initial request to get the total number of issues
  const initialResponse = await api.asUser().requestJira(route/rest/api/3/search?jql=project=${projectId}%20AND%20Sprint=${sprintId}&startAt=${startAt}&maxResults=1, {
    headers: {
      'Accept': 'application/json'
    }
  });
  const initialData = await initialResponse.json();
  const total = initialData.total;

  // Fetch issues in batches until all issues are retrieved
  while (startAt < total) {
    const response = await api.asUser().requestJira(route/rest/api/3/search?jql=project=${projectId}%20AND%20Sprint=${sprintId}&startAt=${startAt}&maxResults=${maxResults}, {
      headers: {
        'Accept': 'application/json'
      }
    });
    const data = await response.json();
    allIssues = allIssues.concat(data.issues);
    startAt += maxResults;
  }
  return allIssues;
});

resolver.define('getSprintDetails', async ({ payload }) => {
  const { sprintId } = payload;
  const response = await api.asUser().requestJira(route/rest/agile/1.0/sprint/${sprintId});
  const data = await response.json();
  return data;
});

resolver.define('setSelectedProject', (req) => {
  selectedProject = req.payload.projectId;
  return selectedProject;
});

resolver.define('getSelectedProject', () => {
  return { id: selectedProject, name: selectedProject };
});

resolver.define('setSelectedSprint', (req) => {
  selectedSprint = req.payload.sprintId;
  return selectedSprint;
});

resolver.define('getSelectedSprint', () => {
  return { id: selectedSprint, name: selectedSprint };
});

resolver.define('getIssuesByJQL', async ({ payload }) => {
  const { jql } = payload;
  let startAt = 0;
  let maxResults = 50;
  let allIssues = [];

  // Initial request to get the total number of issues
  const initialResponse = await api.asUser().requestJira(route/rest/api/3/search?jql=${jql}&startAt=${startAt}&maxResults=1, {
    headers: {
      'Accept': 'application/json'
    }
  });
  const initialData = await initialResponse.json();
  const total = initialData.total;

  // Fetch issues in batches until all issues are retrieved
  while (startAt < total) {
    const response = await api.asUser().requestJira(route/rest/api/3/search?jql=${jql}&startAt=${startAt}&maxResults=${maxResults}, {
      headers: {
        'Accept': 'application/json'
      }
    });
    const data = await response.json();
    allIssues = allIssues.concat(data.issues);
    startAt += maxResults;
  }

  return allIssues;
});

export const handler = resolver.getDefinitions();