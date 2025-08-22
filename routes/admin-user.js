const router = require('express').Router();

const multer  = require('multer');

const upload = multer(
  {
    storage:  multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, './public/upload');
      },
      filename: function (req, file, cb) {
        cb(null, `${Date.now()}_${file.originalname}`);
      }
    })
  }
);

const BcryptJs = require('bcryptjs');
const Passport = require('../modules/passport');
const UserModel = require('../models/user');
const UserRole = require('../constants/user-role');
const { db } = require('../models/user');

/**
 * @swagger
 * tags:
 *   name: AdminUser
 *   description: Quản lý user trong trang admin
 */

/**
 * @swagger
 * /admin/user/:
 *   get:
 *     summary: Trang mặc định của admin user
 *     tags: [AdminUser]
 *     responses:
 *       302:
 *         description: Redirect về danh sách user
 */
router.get('/', Passport.requireAuth, (req, res) => {
  res.redirect('/admin/user/danh-sach.html'); 
});

/**
 * @swagger
 * /admin/user/danh-sach.html:
 *   get:
 *     summary: Lấy danh sách tất cả user
 *     tags: [AdminUser]
 *     responses:
 *       200:
 *         description: Trả về danh sách user
 */
router.get('/danh-sach.html', Passport.requireAuth, async (req, res) => {
  const model = {};
  
  model.data = await UserModel.find().lean();
  
  res.render('admin/user/list', model);
});

/**
 * @swagger
 * /admin/user/sua/{id}.html:
 *   get:
 *     summary: Lấy thông tin chi tiết của 1 user
 *     tags: [AdminUser]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin user
 */
router.get('/sua/:id.html', Passport.requireAuth, async (req, res) => {
  const docUser = await UserModel.findOne(
    {
      id: req.params.id
    }
  ).lean();

  docUser.password = '';

  const aRole = [];

  for (const x in UserRole) {
    aRole.push(UserRole[`${x}`]);
  }

  res.render('admin/user/edit', {
    errors: null,
    roles: aRole,
    user: docUser
  });
});

/**
 * @swagger
 * /admin/user/sua/{id}.html:
 *   post:
 *     summary: Cập nhật thông tin user
 *     tags: [AdminUser]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *               hinh:
 *                 type: string
 *                 format: binary
 *     responses:
 *       302:
 *         description: Redirect về trang sửa user sau khi cập nhật
 */
router.post('/sua/:id.html', Passport.requireAuth, upload.single('hinh'), async (req, res) => {
  const docUser = await UserModel.findOne(
    {
      id: req.params.id
    }
  ).lean();

  docUser.password = '';

  const aRole = [];

  for (const x in UserRole) {
    aRole.push(UserRole[`${x}`]);
  }

  req.checkBody('fullname', 'Name cannot be empty').notEmpty();

  req.checkBody('fullname', 'Name from 5 to 32 characters').isLength(
    {
      min: 5,
      max: 32
    }
  );

  req.checkBody('email', 'Email cannot be empty').notEmpty();

  req.checkBody('email', 'Invalid email format').isEmail();

  const errors = req.validationErrors();
  
  if (errors){
    console.log();
    console.log(errors);
    // return res.render('admin/user/edit', {
    //   errors,
    //   roles: aRole,
    //   user: docUser
    // });
  }

  const sEmail = req.body.email.trim().toLowerCase();

  if (sEmail !== docUser.email) {
    const lst = await UserModel.find(
      {
        email: req.body.email
      }
    ).lean();

    if (lst && lst.length > 0) {
      return res.render('admin/user/edit', {
        errors: [
          {
            msg: 'Email already exists'
          }
        ],
        roles: aRole,
        user: docUser
      });
    }
  }

  const updateData = {
    fullname: req.body.fullname,
    email: req.body.email
  };

  if (req.body.password && req.body.password.length > 0) {
    const sHashSalt = BcryptJs.genSaltSync(16);
      
    updateData.password = BcryptJs.hashSync(req.body.password, sHashSalt);
  }

  if (req.file && req.file.filename) {
    updateData.photo = req.file.filename;
  }

  if (req.body.role && req.body.role.length > 0) {
    updateData.roles = [];

    for (const x of req.body.role.split('|')) {
      if (x && x.length > 0) {
        updateData.roles.push(x);
      }
    }
  }
  
  await UserModel.update(
    {
      id: docUser.id
    },
    updateData
  );

  req.flash('response_message', 'Successfully Fixed');

  res.redirect(`/admin/user/sua/${req.params.id}.html`);
});
/**
 * @swagger
 * /admin/user/xoa/{id}:
 *   get:
 *     summary: Xóa user (đánh dấu isDeleted = true)
 *     tags: [AdminUser]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect về danh sách user sau khi xóa
 */
router.get('/xoa/:id', Passport.requireAuth, async (req, res) => {
  const docUser = await UserModel.findOne(
    {
      id: req.params.id,
      // isDeleted: false
      
    }
  ).lean();

  if (!docUser || !docUser.id) {
    req.flash('response_message', 'Invalid Input Parameter');
  } else {
    // await UserModel.updateOne(
    //   {
    //     id: docUser.id
    //   },
    //   {
    //     $set:{
    //       isDeleted: true
    //     }
    //   },
      
    // );
    await UserModel.findOneAndUpdate({id: docUser.id}, {isDeleted: true} , {new: true, useFindAndModify: false})
   
    req.flash('response_message', 'Deleted Successfully');
  }
  res.redirect('/admin/user/danh-sach.html');
});

module.exports = router;
