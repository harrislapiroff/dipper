// Description:
//   Queries for information to Toggl
//
// Notes:
//   Requires environment variables TOGGL_WORKSPACE_ID and TOGGL_API_TOKEN to be set
//
// Commands:
//   hubot who's working? - Tell me who's currently working and what they're working on
//   who's working - Tell me who's currently working and what they're working on

const axios = require('axios')
const moment = require('moment')

const TOGGL_WORKSPACE_ID = process.env.TOGGL_WORKSPACE_ID
const TOGGL_API_TOKEN = process.env.TOGGL_API_TOKEN


const togglAxios = axios.create({ auth: {
  username: TOGGL_API_TOKEN,
  password: 'api_token',
}})


const togglClient = {
  getWorkspaceDashboard: function (id) {
    return togglAxios.get(`https://www.toggl.com/api/v8/dashboard/${id}`)
  },
  getWorkspaceUsers: function (id) {
    return togglAxios.get(`https://www.toggl.com/api/v8/workspaces/${id}/users`)
  },
  getWorkspaceProjects: function(id) {
    return togglAxios.get(`https://www.toggl.com/api/v8/workspaces/${id}/projects`)
  },
  getWorkspaceClients: function (id) {
    return togglAxios.get(`https://www.toggl.com/api/v8/workspaces/${id}/clients`)
  }
}


const robot = function(robot) {

  robot.hear(/who( is|['’]?s) working/i, (res) => {
    res.send('Give me a moment to check.')
    axios.all([
      togglClient.getWorkspaceDashboard(TOGGL_WORKSPACE_ID),
      togglClient.getWorkspaceUsers(TOGGL_WORKSPACE_ID),
      togglClient.getWorkspaceProjects(TOGGL_WORKSPACE_ID),
      togglClient.getWorkspaceClients(TOGGL_WORKSPACE_ID),
    ])
    .then(axios.spread((dashboardReq, usersReq, projectsReq, clientsReq) => {
      const dashboard = dashboardReq.data
      const users = usersReq.data
      const projects = projectsReq.data
      const clients = clientsReq.data
      // Currently active toggl entries have negative duration
      const activeEntries = dashboard.activity.filter((entry) => entry.duration < 0)

      // If no one is working, say so and short circuit
      if (activeEntries.length === 0) {
        res.send('No one seems to be working right now.')
        return
      }

      activeEntries.forEach((entry) => {
        const entryUser = users.filter((user) => user.id === entry.user_id)[0]
        const entryProject = projects.filter((project) => project.id === entry.project_id)[0]
        const entryClient = clients.filter((client) => client.id === entryProject.cid)[0]
        // toggl duration is a negative seconds timestamp of when the entry timer started
        // Date.now() + entry.duration * 1000 gives the approximate duration since the entry started in ms
        const entryDuration = moment.duration(Date.now() + entry.duration * 1000)
        res.send(`*${entryUser.fullname}* has been working on *${entry.description} (${entryClient.name}: ${entryProject.name})* for *${entryDuration.humanize()}*.`)
      })
    }))
    .catch((error) => {
      res.send(`Something went wrong asking Toggl for information. ${error}. ${error.response.data}`)
    })

  })

}

module.exports = robot;
