# Developer Performance by Sprint - Jira Forge App

This project is a Jira Forge application that provides a report on developer performance during a sprint. The report system displays various metrics including estimated time, time spent, workload compliance, and more, for each developer. The goal of this project is to help Scrum Masters and Project Managers monitor the efficiency of their teams during a sprint.

## Features
- **Select Project, Board, and Sprint**: Choose a Jira project, board, and sprint to generate a performance report.
- **JQL Query**: Use a JQL query to filter issues and generate a report.
- **Non-Working Days**: Provide a Google Sheet link containing the non-working days, which will be taken into account when calculating working hours.
- **Developer Metrics**: View detailed metrics including total estimated time, total time spent, outstanding time, workload difference, workload compliance, tasks completed, average cycle time, and defects assigned and resolved for each developer.

## Prerequisites
- Jira instance with Forge app permissions enabled.
- A valid Jira account with sufficient permissions to access projects and boards.
- A Google Sheet link containing non-working days in DD/MM/YYYY format.

## Installation
1. Clone the repository from GitHub:
   ```sh
   git clone https://github.com/yourusername/jira-report-dashboard.git
   cd jira-report-dashboard
   ```

2. Install the Forge CLI if it is not already installed. For installation instructions, refer to [Forge CLI documentation](https://developer.atlassian.com/platform/forge/cli/).

3. Deploy the Forge app:
   ```sh
   forge deploy
   ```

4. Install the app in your Jira instance:
   ```sh
   forge install
   ```
   Follow the prompts to install the app on your Jira site.

## Usage
1. After installing the app, navigate to the **Developer Performance by Sprint** page under your Jira project.

2. Click on the **Settings** button (gear icon) to open the configuration modal.
   - **Project/Board/Sprint Tab**: Select a project, board, and sprint to generate a report.
   - **JQL Query Tab**: Alternatively, enter a JQL query to filter issues for the report.
   - **Non Working Days Tab**: Provide the Google Sheet link containing the non-working days. The sheet should have dates in DD/MM/YYYY format.

3. After configuring the settings, click the **Generate Report** button on the page to view the developer metrics.

## Metrics Explained
- **Total Estimated Time**: Total hours estimated for the tasks assigned to a developer.
- **Total Time Spent**: Total hours logged by the developer during the sprint.
- **Outstanding Time**: Difference between estimated time and time spent.
- **Workload Difference**: Difference between time spent and expected working hours.
- **Workload Compliance**: Difference between estimated time and expected working hours.
- **Number of Tasks Completed**: Total number of completed tasks.
- **Average Cycle Time**: Average time taken to complete tasks.
- **Defects Assigned and Resolved**: Number of defect issues assigned and resolved.

## Google Sheet Setup
Provide a Google Sheet link containing the non-working days. Each non-working day should be listed in **DD/MM/YYYY** format, one per row. This helps in accurate calculation of the total working hours during the sprint.

## Known Issues
- **Undefined Dates**: If sprint start and end dates are displayed as "undefined", ensure that sprint details are fetched properly by verifying permissions and data availability.
- **Report Not Generated on Dropdown Selection**: Report generation is triggered only when the **Generate Report** button is clicked.

## Contributing
Contributions are welcome! If you find a bug or have a suggestion for improvement, feel free to open an issue or submit a pull request.

1. Fork the repository.
2. Create your feature branch:
   ```sh
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes:
   ```sh
   git commit -m 'Add some AmazingFeature'
   ```
4. Push to the branch:
   ```sh
   git push origin feature/AmazingFeature
   ```
5. Open a pull request.

## License
This project is licensed under the MIT License. See the LICENSE file for more information.

## Acknowledgments
- Atlassian for providing the Jira Forge framework.
- The Jira development community for valuable insights and support.

## Contact
If you have any questions, feel free to contact the repository owner at [sainawkham@globalwave.com.mm].

