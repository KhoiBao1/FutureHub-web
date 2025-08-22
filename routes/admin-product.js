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

const CategoryModel = require('../models/category');
const Charset = require('../modules/charset');
const Passport = require('../modules/passport');
const ProductModel = require('../models/product');

router.get('/', Passport.requireAuth, (req, res) => {
  res.redirect('/admin/product/danh-sach.html');
});

router.get('/danh-sach.html', Passport.requireAuth, async (req, res) => {
  const model = {};
  
  model.data = await ProductModel.find(
    {
      isDeleted: false
    }
  ).lean();
  
  res.render('admin/product/list', model);
});

router.get('/them.html', Passport.requireAuth, async (req, res) => {
  const model = {
    errors: null
  };
  
  model.category = await CategoryModel.find(
    {
      isDeleted: false
    }
  ).lean();
  
  res.render('admin/product/create', model);
});

/**
 * @swagger
 * /admin/product/them.html:
 *   post:
 *     summary: Thêm sản phẩm mới
 *     tags: [Admin - Product]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: id
 *         type: number
 *         required: true
 *         description: ID sản phẩm
 *       - in: formData
 *         name: categoryId
 *         type: number
 *         required: true
 *         description: ID danh mục
 *       - in: formData
 *         name: name
 *         type: string
 *         required: true
 *         description: Tên sản phẩm
 *       - in: formData
 *         name: urlRewriteName
 *         type: string
 *         required: false
 *         description: URL rewrite
 *       - in: formData
 *         name: photo
 *         type: file
 *         required: false
 *         description: Ảnh sản phẩm
 *       - in: formData
 *         name: description
 *         type: string
 *         required: false
 *       - in: formData
 *         name: price
 *         type: number
 *         required: true
 *       - in: formData
 *         name: sale
 *         type: number
 *         required: false
 *       - in: formData
 *         name: sale1
 *         type: number
 *         required: false
 *       - in: formData
 *         name: salePrice
 *         type: number
 *         required: false
 *       - in: formData
 *         name: isDeleted
 *         type: boolean
 *         required: false
 *     responses:
 *       200:
 *         description: Thêm sản phẩm thành công
 */
router.post('/them.html', Passport.requireAuth, upload.single('hinh'), async (req, res) => {
  const lstCategory = await CategoryModel.find(
    {
      isDeleted: false
    }
  ).lean();

  req.checkBody('name', 'Name cannot be empty').notEmpty();

  //req.checkBody('hinh', 'Hình không được rỗng').notEmpty();

  req.checkBody('price', 'Price must be number').isInt();
  //req.checkBody('SL', 'số lượng phải là số').isInt();

  req.checkBody('description', 'Details must not be empty').notEmpty();
  
  const errors = req.validationErrors();

  if (errors) {
    const model = {
      errors,
      category: lstCategory
    };
    
    return res.render('admin/product/create', model);
  }

  const createData = {
    name: req.body.name,
    urlRewriteName: Charset.removeUnicode(req.body.name),
    categoryId: req.body.categoryId,
    description: req.body.description,
    price: req.body.price,
    sale: req.body.sale,
    sale1: req.body.sale1,
    isDeleted: false
  };

  createData.salePrice = createData.price - (createData.sale * createData.price) / 100;

  createData.urlRewriteName = Charset.removeUnicode(req.body.name);

  if (req.file && req.file.filename) {
    createData.photo = req.file.filename;
  }

  await ProductModel.create(createData);

  req.flash('response_message', 'Added Success');

  res.redirect('/admin/product/them.html');
});

router.get('/sua/:id.html', Passport.requireAuth, async (req, res) => {
  const model = {
    errors: null
  };

  model.category = await CategoryModel.find(
    {
      isDeleted: false
    }
  ).lean();

  model.product = await ProductModel.findOne(
    {
      id: req.params.id
    }
  ).lean();

  res.render('admin/product/edit', model);
});

/**
 * @swagger
 * /admin/product/sua/{id}.html:
 *   post:
 *     summary: Cập nhật sản phẩm
 *     tags: [Admin - Product]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: number
 *         description: ID sản phẩm
 *       - in: formData
 *         name: categoryId
 *         type: number
 *       - in: formData
 *         name: name
 *         type: string
 *       - in: formData
 *         name: urlRewriteName
 *         type: string
 *       - in: formData
 *         name: photo
 *         type: file
 *       - in: formData
 *         name: description
 *         type: string
 *       - in: formData
 *         name: price
 *         type: number
 *       - in: formData
 *         name: sale
 *         type: number
 *       - in: formData
 *         name: sale1
 *         type: number
 *       - in: formData
 *         name: salePrice
 *         type: number
 *       - in: formData
 *         name: isDeleted
 *         type: boolean
 *     responses:
 *       200:
 *         description: Sửa sản phẩm thành công
 */
router.post('/sua/:id.html',  upload.single('hinh'), async (req, res) => {
  const lstCategory = await CategoryModel.find(
    {
      isDeleted: false
    }
  ).lean();

  const docProduct = await ProductModel.findOne(
    {
      id: req.params.id
    }
  ).lean();

  if (!docProduct || !docProduct.id) {
    return res.render('admin/product/edit', {
      errors: [
        {
          msg: 'Invalid Input Parameter'
        }
      ],
      category: lstCategory
    });
  }

  req.checkBody('name', 'Name cannot be empty').notEmpty();

  //req.checkBody('hinh', 'Hình không được rỗng').notEmpty();

  req.checkBody('price', 'Price must be number').isInt();

  req.checkBody('description', 'Details must not be empty').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    return res.render('admin/product/edit', {
      errors,
      category: lstCategory,
      product: docProduct
    });
  }

  const updateData = {
    name: req.body.name,
    categoryId: req.body.categoryId,
    description: req.body.description,
    price: req.body.price,
    sale: req.body.sale,
    sale1: req.body.sale,
  };

  updateData.salePrice = updateData.price - (updateData.sale * updateData.price) / 100;

  updateData.urlRewriteName = Charset.removeUnicode(req.body.name);

  if (!req.file || !req.file.filename) {
    updateData.photo = docProduct.photo;
  }
  else {
    updateData.photo = req.file.filename;
  } 
  
  await ProductModel.update(
    {
      id: docProduct.id
    },
    updateData
  );

  req.flash('response_message', 'Successfully Fixed');

  res.redirect(`/admin/product/sua/${req.params.id}.html`);
});
/**
 * @swagger
 * /admin/product/xoa/{id}:
 *   get:
 *     summary: Xóa sản phẩm
 *     tags: [Admin - Product]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: number
 *         description: ID sản phẩm
 *     responses:
 *       200:
 *         description: Xóa sản phẩm thành công
 */
router.get('/xoa/:id', Passport.requireAuth, async (req, res) => {
  const docProduct = await ProductModel.findOne(
    {
      id: req.params.id,
      isDeleted: false
    }
  ).lean();

  if (!docProduct || !docProduct.id) {
    req.flash('response_message', 'Invalid Input Parameter');
  } else {
    await ProductModel.update(
      {
        id: docProduct.id
      },
      {
        isDeleted: true
      }
    );

    req.flash('response_message', 'Deleted Successfully');
  }

  res.redirect('/admin/product/danh-sach.html');
});

module.exports = router;
