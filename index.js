const fs = require("fs");
const path = require("path");
const StreamZip = require('node-stream-zip');
const parseString = require('xml2js').parseString;
const Iconv = require('iconv').Iconv;

const booksDir = path.resolve(__dirname, "books");

const booksPaths = fs.readdirSync(booksDir).map(bookPath => path.resolve(booksDir, bookPath));
const booksPromised = booksPaths.map(getBookContentPromised);

Promise.all(booksPromised).then(booksArray => {
    const booksMap = new Map();
    booksArray.forEach(([bookObj, bookPath]) => {
        // Не успеваю. На этом моменте осталось три минуты.
        // Планировал сгрупировать по автору в booksMap
        // Далее планировал отсортировать уже внутри booksMap или что-то такое
    })
});

function getBookContentPromised(bookPath) {
    return new Promise((resolve, reject) => {
        const extname = path.extname(bookPath);

        if (extname === ".zip") {
            const zip = new StreamZip({
                file: bookPath,
                storeEntries: true
            });
            zip.on("ready", () => {
                const { name } = Object.values(zip.entries())[0];
                const data = zip.entryDataSync(name);
                readXmlData(data, bookPath, resolve);
            })
        } else {
            fs.readFile(bookPath, (err, data) => {
                readXmlData(data, bookPath, resolve);
            })
        }
    });
}

function readXmlData(data, bookPath, resolve) {
    const encoding = getXmlEncoding(data);

    const conv = Iconv(encoding, "utf8");
    const xml = conv.convert(data).toString();

    parseString(xml, (err, result) => {
        resolve([result, bookPath]);
    })
}

function getXmlEncoding(data) {
    return data.toString("utf-8").match(/(?:encoding=")(.+?)"/)[1];
}
