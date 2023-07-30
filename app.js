const express = require("express");
const path = require("path");

const {open} = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname,"covid19India.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
    try {
        db = await open(
            {
                filename: dbPath,
                driver: sqlite3.Database
            }
        );
        app.listen(3000, () => {
            console.log("Server Running at http://localhost:3000/");
        });
    } catch(e) {
        console.log(`DB Error: ${e.message}`);
        process.exit(1);
    }
}

initializeDBAndServer();

const convertStateDBObjectToResponseObject = (dbObject) => {
    return {
        stateId: dbObject.state_id,
        stateName: dbObject.state_name,
        population: dbObject.population
    };
};

const convertDistrictDBObjectToResponseObject = (dbObject) => {
    return {
        districtId: dbObject.district_id,
        districtName: dbObject.district_name,
        stateId: dbObject.state_id,
        cases: dbObject.cases,
        cured: dbObject.cured,
        active: dbObject.active,
        deaths: dbObject.deaths
        };
};

//Get States API
app.get("/states/", async (requset, response) => {
    const getStatesQuery = `
    SELECT 
      *
    FROM
      state
    ORDER BY 
      state_id;`;
    const statesArray = await db.all(getStatesQuery);
    response.send(
          statesArray.map((eachState) => convertStateDBObjectToResponseObject(eachState))
        );
});

//Get State API
app.get("/states/:stateId/", async (request,response) => {
    const {stateId} = request.params;
    const getStateQuery = `
    SELECT
      *
    FROM
      state
    WHERE
      state_id = ${stateId};`;
    const state = await db.get(getStateQuery);
    response.send(convertStateDBObjectToResponseObject(state));
});

//Add Districts API
app.post("/districts/", async (request, response) => {
    const districtDetails = request.body;
    const {stateId, districtName, cases, cured, active, deaths} = districtDetails;
    const addDistrictDetails = `
    INSERT INTO
      district (state_id, district_name, cases, cured, active, deaths)
    VALUES
      (${stateId}, '${districtName}', ${cases}, ${cured}, ${active}, ${deaths});`;
    await db.run(addDistrictDetails);
    response.send("District Successfully Added");
});

//Get District API
app.get("/districts/:districtId", async (request, response) => {
    const {districtId} = request.params;
    const getDistrictQuery = `
    SELECT 
      *
    FROM
      district
    WHERE
      district_id = ${districtId};`;
    const district = await db.get(getDistrictQuery);
    response.send(convertDistrictDBObjectToResponseObject(district));
});

//Delete District API
app.delete("/districts/:districtId", async (request, response) => {
    const {districtId} = request.params;
    const deleteDistrictQuery = `
    DELETE FROM 
      district
    WHERE
      district_id = ${districtId};`;
    await db.run(deleteDistrictQuery);
    response.send("District Removed");
});

//Update District API
app.put("/districts/:districtId", async (request, response) => {
    const {districtId} = request.params;
    const districtDetails = request.body;
    const {districtName, stateId, cases, cured, active, deaths} = districtDetails;
    const updateDistrictQuery = `
    UPDATE
      district
    SET 
      district_name = '${districtName}',
      state_id = ${stateId},
      cases = ${cases},
      cured = ${cured},
      active = ${active},
      deaths = ${deaths}
    WHERE
      district_id = ${districtId};`;
    await db.run(updateDistrictQuery);
    response.send("District Details Updated");
});

//Get total API
app.get("/states/:stateId/stats/", async (request, response) => {
    const {stateId} = request.params;
    const getStateStatsQuery = `
    SELECT
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM 
      district
    WHERE
      state_id = ${stateId};`;
    const statsDetails = await db.get(getStateStatsQuery);
    response.send({
        totalCases: statsDetails["SUM(cases)"],
        totalCured: statsDetails["SUM(cured)"],
        totalActive: statsDetails["SUM(active)"],
        totalDeaths: statsDetails["SUM(deaths)"] 
    });
});

//Get District's State Name API
app.get("/districts/:districtId/details/", async (request, response) => {
    const {districtId} = request.params;
    const getStateNameQuery = `
    SELECT
      state_name
    FROM 
      district
    NATURAL JOIN
      state
    WHERE
      district_id = ${districtId};`;
    const state = await db.get(getStateNameQuery);
    response.send({stateName: state.state_name});
});

module.exports = app;