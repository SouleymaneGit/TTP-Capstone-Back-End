const express = require('express');
const router = express.Router();
const fileUpload = require('express-fileupload');
const axios = require('axios')
const dotenv = require('dotenv').config()
const models = require('../db/models')

// importing the Levenshtein algo to calculate the Levenshtein distance between names in table and names from API 
const levenshteinDistance = require('./levenshtein');
const { request } = require('express');

findMatches = async (students, courseNumber) => {
  var arr = []
  let studentsTable = await models.Student.findAll({where: {CourseId:courseNumber}}); 
  students.forEach(student =>{
    studentsTable.forEach(entry =>{
      if (levenshteinDistance(student.toLowerCase(), entry.dataValues.name.toLowerCase()) <= 2) {
        arr.push(entry.dataValues.name)
      }
    })
  })
  return arr
}

router.post('/', async (request, response, nextMiddleware) => {  
  console.log("Request date:", request.body.date)
  console.log("base64:", request.body.imgToBase64)
  console.log(process.env.API_KEY)
  const imgToBase64 = request.body.imgToBase64
  try {
    const base64ToText = await axios.post(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.API_KEY}`,{
      "requests": [
        {
          "image": {
            "content": imgToBase64
          },
          "features": [
            {
              "type": "TEXT_DETECTION"
            }
          ]
        }
      ]
    })
    const data = base64ToText.data.responses[0].textAnnotations[0].description
    const students = data.split("\n")
    const courseNumber = request.body.id
    const matches = await findMatches(students, courseNumber)
    models.Attendance.findAll({where: {CourseId: request.body.id}})
    .then(attendanceSheets => {
      for (let attendanceSheet of attendanceSheets){
        if (attendanceSheet.date == request.body.date) {
          attendanceSheet.destroy();
        }
      }
    })
    console.log("type:", typeof request.body.date )
    console.log(request.body.date )
    models.Attendance.create({
      studentsPresent: matches,
      CourseId:courseNumber,
      date: request.body.date
    })
    console.log(matches)
    response.status(200).json(matches)
  } catch(error) {
    response.status(400).json(error)
  }
})

// Super hackey and complicated, but it works...
router.get('/:id', async (req, res, next)=>{
  console.log("GET for id:", req.params.id)
  try {
    let attendanceSheetObject = {data: {}}
    await models.Student.findAll({
      where: {
        CourseId: req.params.id
      }
    }).then(async allStudents => {
      
      for (student of allStudents){
        attendanceSheetObject.data[student.dataValues.name] = {}
        }
        
      await models.Attendance.findAll({
        where: {
          CourseId: req.params.id
        }
      })
      .then(
        async attendanceSheets => {
          for (let attendanceSheet of attendanceSheets) {
            let date = attendanceSheet.date
            for (student of Object.keys(attendanceSheetObject.data)){
              if (!(date in Object.keys(student))) {
                attendanceSheetObject.data[student][date] = "absent"
              }
            }
          }
          for (let student of Object.keys(attendanceSheetObject.data)){
            for (let attendanceSheet of attendanceSheets) {
              const objectArray = Object.entries(attendanceSheet.studentsPresent)
              objectArray.forEach(([key, value]) => {
                if (student == value){
                  attendanceSheetObject.data[student][attendanceSheet.date] = "present"
                }
              });
            }
          }
          res.status(200).json(attendanceSheetObject)
        }
      ) 
    }).catch(err => res.json(err))
  } catch (error) {
    console.log(error);
  }
})

module.exports = router;