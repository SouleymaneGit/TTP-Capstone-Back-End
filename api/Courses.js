const express = require('express');
const router = express.Router();

const { Course } = require('../db/models');


// Routes for Courses
router.get('/:id', async (req, res, next) => {
  try {
    await Course.findAll({
      where:{
        teacherId: req.params.id
      }
    })
      .then(
        response => res.json(response)
      )

  } catch (error) {
    console.log(error)
  }
});

// router.get('/:id', async (req, res, next) => {
//   try {
//     await Course.findAll({
//       where: {
//         id: req.params.id
//       }
//     })
//       .then((response) => { res.status(200).json(response) })
//   } catch (err) {
//     console.log(err);
//   }
// })

router.put('/edit/:id', async (req, res, next) => {
  try {
    const data = await Course.findByPk(req.params.id);
    data.update({
      name: req.body.name
    })
    data.save();
  } catch (err) { console.log("err" + err) }
})



router.post('/', async (req, res, next) => {
  await Course.create({
    name: req.body.formValues.name,
    teacherId: req.body.teacherId
  })

    .then(course => res.status(200).json(course))
    .catch(error => {
      console.log("there is an error" + error);
      res.status(500).send("There is an error" + error);
    })
})

router.delete('/delete/:id', async (req, res, next) => {
  console.log("deleting", req.params.id)
  try {
    const data = await Course.findByPk(req.params.id)
    .then(course => {
      if (!course) {
        return res.status(404).json({
          message: "course not found"
        })
      } 
      course.destroy();
      res.status(200)
      .json(course)
    })
  } catch (err) {
    console.log(err);
  }
})

module.exports = router;