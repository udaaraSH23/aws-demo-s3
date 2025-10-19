const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');

const app = express();
const port = 3000;

// Configure S3
const s3 = new AWS.S3({ region: 'us-east-1' }); // replace with your region
const BUCKET_NAME = 'udara-bucket-7d81c279'; // replace with your S3 bucket name

app.post('/upload', upload.single('file'), (req, res) => {
    const fileContent = fs.readFileSync(req.file.path);
    const params = {
        Bucket: BUCKET_NAME,
        Key: req.file.originalname,
        Body: fileContent
    };

    s3.upload(params, (err, data) => {
        fs.unlinkSync(req.file.path); // delete local file
        if (err) return res.status(500).send(err);
        res.send(`File uploaded successfully. ${data.Location}`);
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
