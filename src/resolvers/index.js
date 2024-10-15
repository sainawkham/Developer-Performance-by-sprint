import Resolver from '@forge/resolver';
import api, { storage, route } from '@forge/api';

const resolver = new Resolver();

let selectedProject = null;
let selectedSprint = null;

// Save user preferences
resolver.define('saveUserPreferences', async ({ payload }) => {
  const { project, board, sprint, jql, googleSheetLink, option } = payload;
  console.log('Saving user preferences:', { project, board, sprint, jql, googleSheetLink, option });
  await storage.set('userPreferences', { project, board, sprint, jql, googleSheetLink, option });
  return 'Preferences saved successfully.';
});

// Get user preferences
resolver.define('getUserPreferences', async () => {
  const preferences = await storage.get('userPreferences');
  console.log('Retrieved user preferences:', preferences);
  return preferences || {};
});

resolver.define('getProjects', async () => {
  const response = await api.asApp().requestJira(route`/rest/api/3/project/search`);
  const data = await response.json();
  return data.values;
});

resolver.define('getBoards', async (req) => {
  const response = await api.asApp().requestJira(route`/rest/agile/1.0/board`);
  const data = await response.json();  
  return data.values;
});

resolver.define('getSprints', async (req) => {
  const { boardId } = req.payload;
  const response = await api.asApp().requestJira(route`/rest/agile/1.0/board/${boardId}/sprint`);
  const data = await response.json();  
  return data.values;
});

resolver.define('getSprintData', async ({ payload }) => {
  const { projectId, sprintId } = payload;
  let startAt = 0;
  let maxResults = 50;
  let allIssues = [];

  const initialResponse = await api.asUser().requestJira(route`/rest/api/3/search?jql=project=${projectId}%20AND%20Sprint=${sprintId}&startAt=${startAt}&maxResults=1`, {
    headers: {
      'Accept': 'application/json'
    }
  });
  const initialData = await initialResponse.json();
  const total = initialData.total;

  while (startAt < total) {
    const response = await api.asUser().requestJira(route`/rest/api/3/search?jql=project=${projectId}%20AND%20Sprint=${sprintId}&startAt=${startAt}&maxResults=${maxResults}`, {
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
  const response = await api.asUser().requestJira(route`/rest/agile/1.0/sprint/${sprintId}`);
  const data = await response.json();
  return data;
});

resolver.define('getNonWorkingDays', async ({ payload }) => {
  const { googleSheetLink } = payload;

  try {
    console.log("Reached here for fetching Google Sheet");
    const google = api.asUser().withProvider('google');

    // Check if credentials exist and are valid
    let hasCredentials = await google.hasCredentials();
    if (!hasCredentials) {
      console.log("Requesting Google credentials...");
      await google.requestCredentials();  // Prompt the user to reauthorize
      hasCredentials = await google.hasCredentials();  // Recheck after requesting credentials
    }

    // Proceed only if credentials are obtained
    if (!hasCredentials) {
      throw new Error("Failed to acquire Google credentials. Please try again.");
    }

    // Extract the sheet ID from the provided Google Sheet link
    const sheetIdMatch = googleSheetLink.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      throw new Error('Invalid Google Sheet link');
    }
    const sheetId = sheetIdMatch[1];
    console.log("Sheet ID:", sheetId);

    // Fetch non-working days from the Google Sheet using the full URL
    const response = await google.fetch(`/v4/spreadsheets/${sheetId}/values/Sheet1!A:A`);
    console.log("response:", response);
    const responseData = await response.json();

    if (response.status === 200) {
      const rows = responseData.values;
      if (rows.length) {
        const nonWorkingDays = rows.map(row => row[0]);
        console.log('Non-working days:', nonWorkingDays);
        return nonWorkingDays;
      } else {
        console.log('No data found.');
        return [];
      }
    } else {
      throw new Error(`Error fetching data from Google Sheets: ${response.status} - ${responseData.error.message}`);
    }
  } catch (error) {
    console.error('Error fetching non-working days:', error);
    throw error;
  }
});


resolver.define('getIssuesByJQL', async ({ payload }) => {
  const { jql } = payload;
  let startAt = 0;
  let maxResults = 50;
  let allIssues = [];

  const initialResponse = await api.asUser().requestJira(route`/rest/api/3/search?jql=${jql}&startAt=${startAt}&maxResults=1`, {
    headers: {
      'Accept': 'application/json'
    }
  });
  const initialData = await initialResponse.json();
  const total = initialData.total;

  while (startAt < total) {
    const response = await api.asUser().requestJira(route`/rest/api/3/search?jql=${jql}&startAt=${startAt}&maxResults=${maxResults}`, {
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
