const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Message = require('../models/message');
const passport = require('passport');

require('dotenv').config();

/* GET home page. */
router.get('/', async (req, res, next) => {
  try {
    let allMessages;
    if (res.locals.currentUser && res.locals.currentUser.member) {
      allMessages = await Message.find({})
        .populate('author', 'fname lname')
        .exec();
      console.log('populated');
    } else {
      allMessages = await Message.find({}, 'title text').exec();
    }
    res.render('index', {
      title: 'Express',
      user: res.locals.currentUser,
      messages: allMessages,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/delete-msg', async (req, res, next) => {
  try {
    await Message.findByIdAndRemove(req.body.messageid);
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

// Sign up
router.get('/sign-up', (req, res) => {
  if (res.locals.currentUser) {
    res.redirect('/');
  } else {
    res.render('sign-up', { user: res.locals.currentUser });
  }
});

router.post('/sign-up', [
  body('fname')
    .trim()
    .escape()
    .isLength({ min: 0 })
    .withMessage('First name is required')
    .isAlpha()
    .withMessage('First name should be alphabetic'),
  body('lname')
    .trim()
    .escape()
    .isLength({ min: 0 })
    .withMessage('Last name is required')
    .isAlpha()
    .withMessage('Last name should be alphabetic'),
  body('username')
    .trim()
    .escape()
    .isLength({ min: 0 })
    .withMessage('Username is required')
    .isAlphanumeric()
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

      if (!errors.isEmpty()) {
        res.render('sign-up', {
          fname: req.body.fname,
          lname: req.body.lname,
          username: req.body.username,
          password: req.body.password,
          cpassword: req.body.cpassword,
          errors: errors.array(),
        });
      } else {
        const usernameExists = await User.findOne({
          username: req.body.username,
        });
        if (usernameExists) {
          res.render('sign-up', {
            fname: req.body.fname,
            lname: req.body.lname,
            username: req.body.username,
            password: req.body.password,
            cpassword: req.body.cpassword,
            errors: errors
              .array()
              .concat([{ msg: 'A user with that username already exists' }]),
          });
        } else {
          bcrypt.hash(req.body.password, 16, async (err, hashedPassword) => {
            if (err) {
              next(err);
            }
            const user = new User({
              fname: req.body.fname,
              lname: req.body.lname,
              username: req.body.username,
              password: hashedPassword,
              member: false,
              admin: false,
            });
            await user.save();
          });

          res.redirect('/');
        }
      }
    } catch (err) {
      next(err);
    }
  },
]);

// Log in
router.get('/log-in', (req, res) => {
  if (res.locals.currentUser) {
    res.redirect('/');
  } else {
    res.render('log-in', { user: res.locals.currentUser });
  }
});

router.post('/log-in', [
  body('username')
    .trim()
    .escape()
    .isLength({ min: 0 })
    .withMessage('Username is required')
    .isAlphanumeric()
    .withMessage('Usernames are alphanumeric'),
  body('password').isLength({ min: 0 }).withMessage('Passwords are required'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        res.render('log-in', {
          username: req.body.username,
          password: req.body.password,
          errors: errors.array(),
        });
      }

      await passport.authenticate('local', {}, (err, user, options) => {
        if (err) {
          next(err);
        }
        if (!user) {
          res.render('log-in', {
            username: req.body.username,
            password: req.body.password,
            errors: errors.array().concat([{ msg: options.message }]),
          });
        }
        console.log('successful login with user ' + user.fullname);

        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          return res.redirect('/');
        });
      })(req, res, next);
    } catch (err) {
      next(err);
    }
  },
]);

// Log out
router.get('/log-out', (req, res, next) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    } else {
      res.redirect('/');
    }
  });
});

// Join membership
router.get('/join-the-club', (req, res) => {
  if (!res.locals.currentUser) {
    res.redirect('/');
  } else {
    res.render('join-the-club', {
      user: res.locals.currentUser,
    });
  }
});

router.post('/join-the-club', async (req, res, next) => {
  try {
    if (req.body.password !== process.env.password) {
      res.render('join-the-club', {
        user: res.locals.currentUser,
        errors: [{ msg: 'Incorrect password' }],
      });
    } else {
      const user = res.locals.currentUser;
      user.member = true;
      await User.findByIdAndUpdate(user._id, user, {});
      res.redirect('/');
    }
  } catch (err) {
    next(err);
  }
});

// New Message
router.get('/new-message', (req, res, next) => {
  if (!res.locals.currentUser) {
    res.redirect('/');
  } else {
    res.render('new-message', { user: res.locals.currentUser });
  }
});

router.post('/new-message', [
  body('title').trim().isLength({ min: 0 }).withMessage('Title is required'),
  body('text').trim().isLength({ min: 0 }).withMessage('Message is required'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        res.render('new-message', {
          title: req.body.title,
          text: req.body.text,
          errors: errors.array(),
        });
      } else {
        const message = new Message({
          title: req.body.title,
          text: req.body.text,
          timestamp: new Date(),
          author: res.locals.currentUser._id,
        });
        await message.save();
        res.redirect('/');
      }
    } catch (err) {
      next(err);
    }
  },
]);

module.exports = router;
