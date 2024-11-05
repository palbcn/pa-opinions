import path from "path";
import fs from "fs/promises";
import os from "os";
import express from 'express';
import articlesRouter from './articles-router.js';

const __dirname = import.meta.dirname;

let app = express();
// Middleware for parsing request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the "www" 
app.use(express.static(path.join(__dirname, '..', 'www')));
// Serve other static files (those don't exist on "wwww") from the "client" directory and the "assets" directory
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use(express.static(path.join(__dirname, '..', 'assets')));

app.use('/articles', articlesRouter);

// Start server
let server = app.listen(process.env.PORT ?? 8080, () => {
  console.log(`PA Opinion Articles Server is open for e-business on ${server.address().port}`);
});
