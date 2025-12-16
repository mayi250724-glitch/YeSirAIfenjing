import { StoryboardData } from "../types";

export interface ProjectRecord {
  id: string;
  title: string;
  synopsis: string;
  updatedAt: number;
  data: StoryboardData;
}

const STORAGE_KEY = 'yesir_projects_history';

export const saveProject = (data: StoryboardData) => {
  if (!data) return;
  
  const projects = getProjects();
  
  // Use title as a simple unique key for now. 
  // In a real app, we would assign a UUID to the project upon creation.
  const existingIndex = projects.findIndex(p => p.title === data.title);
  
  const record: ProjectRecord = {
    id: existingIndex >= 0 ? projects[existingIndex].id : Date.now().toString(),
    title: data.title,
    synopsis: data.synopsis,
    updatedAt: Date.now(),
    data: data
  };

  const newProjects = [...projects];
  if (existingIndex >= 0) {
    newProjects[existingIndex] = record;
  } else {
    newProjects.unshift(record); // Add to top
  }

  // Limit storage to prevent quota issues
  if (newProjects.length > 20) {
      newProjects.length = 20;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProjects));
  } catch (e) {
    console.error("Failed to save history (Quota exceeded?)", e);
  }
};

export const getProjects = (): ProjectRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const deleteProject = (id: string) => {
  const projects = getProjects().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};
