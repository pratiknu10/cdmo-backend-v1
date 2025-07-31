export const canViewProject = (user, project) => {
  console.log(user);
  return (
    user &&
    (user.role === "admin" ||
      user.accessLevel >= 3 ||
      project.dept === user.dept) &&
    project.team.includes(user.id)
  );
};
export const canUpdateProject = (user, project) => {
  return (
    user &&
    (user.role === "admin" ||
      (user.role === "manager" &&
        user.dept === project.dept &&
        project.team.includes(user.id)) ||
      user.accessLevel >= 3)
  );
};
