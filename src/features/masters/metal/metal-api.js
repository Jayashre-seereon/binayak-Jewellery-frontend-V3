let metals = [
  { id: 1, name: "Gold", alias: "Au", description: "Gold metal" },
  { id: 2, name: "Silver", alias: "Ag", description: "Silver metal" },
];

export const getMetals = () => {
  return Promise.resolve(metals);
};

export const addMetal = (data) => {
  data.id = metals.length + 1;
  metals.push(data);
  return Promise.resolve(data);
};

export const updateMetal = (data) => {
  metals = metals.map((m) => (m.id === data.id ? data : m));
  return Promise.resolve(data);
};

export const deleteMetal = (id) => {
  metals = metals.filter((m) => m.id !== id);
  return Promise.resolve();
};