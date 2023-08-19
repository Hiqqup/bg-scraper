const puppeteer = require('puppeteer');
const Jimp = require('jimp');
const axios = require('axios');
const fs = require('fs').promises;
const readline = require('readline');
const path = require('path');

async function scrapeProduct(url) {
    const browser = await puppeteer.launch({ headless: 'now' });
    const page = await browser.newPage();
    await page.goto(url);

    await page.waitForSelector('img');
    const images = await page.$$('img');

    let linkList = [];
    for (let i = 0; i < 8; i++) {
        const src = await images[i].getProperty('src');
        const srcTxt = await src.jsonValue();
        linkList.push(srcTxt);
    }
    await browser.close();
    console.log(images.length);
    return linkList;
}

async function downloadImage(url, filename) {

    const response = await axios.get(url, { responseType: 'arraybuffer' });
    await fs.writeFile(filename, response.data);
}
function sortImageHeight(images) {
    const n = images.length;

    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (images[j].getHeight() > images[j + 1].getHeight()) {
                // Swap elements
                const temp = images[j];
                images[j] = images[j + 1];
                images[j + 1] = temp;
            }
        }
    }
    return images;
}
async function stitchImages() {
    const outputImagePath = 'stitched.jpg';
    try {
        const imageFiles = await fs.readdir(inputDirectory);
        let images = [];

        for (const file of imageFiles) {
            const imagePath = `${inputDirectory}/${file}`;
            const image = await Jimp.read(imagePath);
            images.push(image);
        }

        images = sortImageHeight(images);
        const colums = 4;

        const width = images[0].getWidth();
        let height = 0;
        for (let i = 0; i < colums; i++) {
            height = Math.max(images[i].getHeight() + images[images.length - 1 - i].getHeight());
        }
        const stitchedImage = new Jimp(width * colums, height);

        let currentX = 0;
        for (let i = 0; i < images.length; i++) {
            if (i < colums) {
                stitchedImage.composite(images[i], currentX, 0);
            }
            else {
                stitchedImage.composite(images[images.length - 1 + colums - i], currentX, images[i - colums].getHeight());
            }
            if (i == colums - 1) currentX = 0;
            else currentX += width;
        }

        await stitchedImage.writeAsync(outputImagePath);
        console.log('Images stitched successfully.');
    } catch (error) {
        console.error('Error:', error);
    }
}


async function main() {
    const filenames = await fs.readdir(inputDirectory);

    for (const filename of filenames) {
        const filePath = path.join(inputDirectory, filename);
        await fs.unlink(filePath);
    }
    const input = await getUserInput();

    const list = await scrapeProduct(`https://www.pinterest.com/search/pins/?q=${input}&rs=typed`);

    for (let i = 0; i < list.length; i++) {
        await downloadImage(list[i], `${inputDirectory}/image${i}.jpg`)

    }
    await stitchImages();
}

function getUserInput() {

    return new Promise((resolve) => {
        rl.question('input?', (answer) => {
            resolve(answer);
        });
    });
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const inputDirectory = 'images';
main()
    .then(() => {
        rl.close();
    }).catch((error) => {
        console.error('An error occurred:', error);
        rl.close();
    });








