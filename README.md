# Developer Performance by Sprint - Jira Forge App

This is a Jira Forge app that provides a comprehensive report on individual developer performance in each sprint. The report can be generated based on project, board, and sprint selection or by using custom JQL queries. The app calculates various metrics such as total estimated time, total time spent, workload difference, compliance, and more.

## Features

- **Developer Performance Report**: View detailed metrics for individual developers including time spent, tasks completed, defects resolved, and more.
- **Sprint Overview**: Displays total working hours in the sprint, based on the selected sprint or custom JQL query.
- **Dynamic Report Generation**: Generate reports instantly with project, board, and sprint filters, or by using JQL.
- **User Preferences**: Save user-selected preferences (project, board, sprint, JQL) for quick access and auto-report generation on page load.

## Installation and Setup

### Prerequisites

- [Forge CLI](https://developer.atlassian.com/platform/forge/set-up-forge/)
- Atlassian Jira Cloud account

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd developer-performance-by-sprint
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Deploy the app**:
   Use the following Forge CLI commands:
   ```bash
   forge deploy
   ```

4. **Install the app**:
   After deployment, install the app into your Jira instance:
   ```bash
   forge install
   ```

5. **Tunnel to test locally**:
   Use Forge tunnel for local development to see changes without redeploying:
   ```bash
   forge tunnel
   ```

### Running the App

1. Navigate to the **Developer Performance by Sprint** page in your Jira project.
2. Choose between two options to generate a report:
   - **Project/Board/Sprint**: Select a project, board, and sprint to generate the report.
   - **JQL Query**: Enter a custom JQL query to generate the report based on specific criteria.
3. Click the **Generate Report** button to view the performance metrics.
4. Your preferences will be automatically saved for future sessions.

### Key Metrics

The report includes the following metrics for each developer:
- **Total Estimated Time (hours)**: Sum of the estimated time for all tasks.
- **Total Time Spent (hours)**: Time logged by the developer in the sprint.
- **Outstanding Time (hours)**: Difference between the estimated time and the time spent.
- **Workload Difference**: Difference between total time spent and the total working hours in the sprint.
- **Workload Compliance**: Difference between total estimated time and total working hours.
- **Number of Tasks Completed**: Count of tasks completed in the sprint.
- **Average Cycle Time**: Average time taken to complete tasks.
- **Number of Defects**: Count of defects assigned and resolved by the developer.

## Permissions

This app requires the following Jira permissions:

```yaml
permissions:
  scopes:
    - read:jira-work
    - read:board-scope:jira-software
    - read:project:jira
    - read:sprint:jira-software
    - storage:app
```

## Storage and Data

- **Persistent Storage**: User preferences (project, board, sprint, JQL) are saved using Forge's storage API.
- **Data Security**: All data is securely stored and encrypted following Atlassian's security guidelines.

## Support and Contributions

If you encounter any issues or want to contribute to this project, feel free to open an issue or submit a pull request.

---

This `README.md` provides an overview of the app, instructions for installation, key features, and usage details. Let me know if you'd like to make any adjustments!
