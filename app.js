const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

let db = null;
const dbPath = path.join(__dirname, "covid19India.db");

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Sever Running on http://localhost:3000/");
    });
  } catch (err) {
    console.log(`DB err:${err.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const convertStateDbObjToServerObj = (DbObj) => {
  return {
    stateId: DbObj.state_id,
    stateName: DbObj.state_name,
    population: DbObj.population,
  };
};

const convertDistDbObjToServerObj = (DbObj) => {
  return {
    districtId: DbObj.district_id,
    districtName: DbObj.district_name,
    stateId: DbObj.state_id,
    cases: DbObj.cases,
    cured: DbObj.cured,
    active: DbObj.active,
    deaths: DbObj.deaths,
  };
};

const convertStaticsDbObjToServerObj = async (DbObj) => {
  return {
    totalCases: DbObj.totalCases,
    totalCured: DbObj.totalCured,
    totalActive: DbObj.totalActive,
    totalDeaths: DbObj.totalDeaths,
  };
};

app.get("/states/", async (request, response) => {
  const getStatesQuery = `SELECT * FROM 
      state;
    `;
  const statesList = await db.all(getStatesQuery);
  response.send(statesList.map((state) => convertStateDbObjToServerObj(state)));
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `SELECT * FROM 
    state WHERE
    state_id=${stateId};
    `;
  const stateDetails = await db.get(getStateQuery);
  response.send(convertStateDbObjToServerObj(stateDetails));
});

app.post("/districts/", async (request, response) => {
  const { stateId, districtName, cases, cured, active, deaths } = request.body;
  const addNewDistrictQuery = `INSERT INTO
     district (state_id,district_name,cases,cured,active,deaths)
     VALUES
      (${stateId},'${districtName}',${cases},${active},${deaths});
    `;
  await db.run(addNewDistrictQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictDetailsQuery = `SELECT * FROM 
    district 
    WHERE district_id=${districtId};
    `;
  const districtDetails = await db.get(getDistrictDetailsQuery);
  response.send(convertDistDbObjToServerObj(districtDetails));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const removeDistrictQuery = `DELETE FROM district 
    WHERE district_id=${districtId};
    `;
  await db.run(removeDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictDetailsQuery = `UPDATE district 
    SET 
    district_name='${districtName}',
    state_id=${stateId},
    cases=${cases},
    cured=${cured},
    active=${active},
    deaths=${deaths}
    WHERE district_id=${districtId};
    `;
  await db.run(updateDistrictDetailsQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const staticsOfStateQuery = `
  SELECT
   sum(cases) as totalCases,
    sum(cured) as totalCured,
    sum(active) as totalActive,
    sum(deaths) as totalDeaths
    FROM district 
    WHERE state_id=${stateId};
    `;
  const staticsOfState = await db.get(staticsOfStateQuery);
  response.send({
    totalCases: staticsOfState["totalCases"],
    totalCured: staticsOfState["totalCured"],
    totalActive: staticsOfState["totalActive"],
    totalDeaths: staticsOfState["totalDeaths"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateQuery = `SELECT state_name
    FROM state
    NATURAL JOIN 
    district WHERE district_id=${districtId};
    `;
  const stateOfDistrict = await db.get(getStateQuery);
  response.send({
    stateName: stateOfDistrict.state_name,
  });
});

module.exports = app;
