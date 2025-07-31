import { projects } from "../data/projectData.js";
import { authorize } from "../middleware/authorize.js";
import { canUpdateProject, canViewProject } from "../policies/projectPolicy.js";
import { handleResponse } from "./helpers.js";

export const viewProject = (req, res, next) => {
  const projectId = parseInt(req.params.id);
  const project = getProjectById(projectId, res);
  console.log(`Project viewed: ${project.name}`);
  authorize(canViewProject, project)(req, res, () => {
    handleResponse(res, 200, "Project retrieved successfully", project);
  });
};
export const updateProject = (req, res, next) => {
  const projectId = parseInt(req.params.id);
  const project = getProjectById(projectId, res);
  console.log(`Project viewed: ${project.name}`);
  authorize(canUpdateProject, project)(req, res, () => {
    handleResponse(res, 200, "Project updated successfully", project);
  });
};

const getProjectById = (projectId, res) => {
  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    handleResponse(res, 404, "Project not found");
  }
  return project;
};
