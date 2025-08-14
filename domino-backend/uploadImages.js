const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dwvfz8o89',
  api_key: '417621168642551',
  api_secret: '4naGnEE023kI6t8Fh21XIvMVuBo'
});


const opts = {
    overwrite: true, invalidate: true, resource_type: "auto",
    };


    module.exports = (image) => { // imgage = › base64
        return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(image, opts, (error, result) => {
        if (result && result.secure_url) {
            console.log(result.secure_url);
        return resolve(result.secure_url);
        }
        console. log(error.message);
return reject({ message: error.message });
        });
    });
    };

module.exports = cloudinary;