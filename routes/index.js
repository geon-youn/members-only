const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/user');

require('dotenv').config();

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/sign-up', (req, res) => {
  res.render('sign-up');
});

router.post('/sign-up', [
  body('fname')
    .trim()
    .escape()
    .isLength({ min: 0 })
    .withMessage('First name is required')
    .isAlpha()
    .withMessage('First name should be alphanumeric'),
  body('lname')
    .trim()
    .escape()
    .isLength({ min: 0 })
    .withMessage('Last name is required')
    .isAlpha()
    .withMessage('Last name should be alphanumeric'),
  body('username')
    .trim()
    .escape()
    .isLength({ min: 0 })
    .withMessage('Username is required')
    .isAlpha()
    .withMessage('Username should be alphanumeric'),
  body('password').isLength({ min: 0 }).withMessage('Password is required'),
  body('cpassword')
    .isLength({ min: 0 })
    .withMessage('Please confirm your password')
    .custom((cpassword, { req }) => {
      return cpassword === req.body.password;
    })
    .withMessage('Passwords do not match'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);

      const user = new User({
        fname: req.body.fname,
        lname: req.body.lname,
        username: req.body.username,
        password: 'temporary',
        member: false,
      });

      if (!errors.isEmpty()) {
        res.render('sign-up', {
          user: user,
          password: req.body.password,
          cpassword: req.body.cpassword,
          errors: errors.array(),
        });
      }

      const usernameExists = await User.findOne({ username: username });
      if (usernameExists) {
        res.render('sign-up', {
          user: user,
          password: req.body.password,
          cpassword: req.body.cpassword,
          errors: errors
            .array()
            .concat([{ msg: 'A user with that username already exists' }]),
        });
      }

      bcrypt.hash(req.body.password, 16, async (err, hashedPassword) => {
        if (err) {
          next(err);
        }
        user.password = hashedPassword;
        user.member = false;
        await user.save();
      });

      res.redirect('/');
    } catch (err) {
      next(err);
    }
  },
]);

router.get('/join-the-club', (req, res) => {
  res.render('join-the-club', { user: req.locals ? req.locals.currentUser : null });
});

router.post('/join-the-club', [
  body('password')
    .custom((password, { req }) => {
      return password === process.env.password;
    })
    .withMessage('Incorrect password'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);

      if (!errors) {
        res.render('join-the-club', {
          user: req.locals.currentUser,
          errors: errors.array(),
        });
      }

      const user = req.locals.currentUser;
      user.member = true;
      await User.findByIdAndUpdate(user._id, user, {});
      res.redirect('/');
    } catch (err) {
      next(err);
    }
  },
]);

module.exports = router;
