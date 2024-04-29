import { error } from "console";

const fs = require("fs");
const path = require("path");
const minimist = require("minimist");
interface RetArguments {
  out_path: string;
  proto_path: Array<string>;
  proto_files: Array<string>;
}
const argv = minimist(process.argv.slice(2), {
  string: ["out_path"], // Az out_path-t szöveges típusként értelmezi
  array: ["proto_path", "proto_files"], // A proto_path és proto_files tömbök
  boolean: ["help", "version"], // nested_messages és logikai típusok
  alias: {
    out_path: "o", // 'out_path' és 'out' ugyanazt az opciót jelenti
    proto_path: "I", // '-I' és 'proto_path' ugyanazt az opciót jelenti
  },
});

function processArgsValidator(args: Array<string>): RetArguments {
  let errors = [];
  const ret: RetArguments = {
    out_path: "",
    proto_path: [],
    proto_files: [],
  };
  try {
    for (const key of Object.keys(argv)) {
      switch (key) {
        case "out_path":
          if (path.isAbsolute(argv.out_path)) {
            ret.out_path = argv.out_path;
          } else {
            ret.out_path = path.join(process.cwd(), argv.out_path);
          }
          break;
        case "help":
          if (argv.help) {
            console.log(fs.readFileSync(path.join(__dirname, "../assets/help.txt"), "utf-8"));
            process.exit(0);
          }
          break;
        case "version":
          if (argv.version) {
            console.log(require("../package.json").version);
            process.exit(0);
          }
          break;
        case "proto_path":
          if (Array.isArray(argv.proto_path)) {
            argv.proto_path = argv.proto_path.map((file) => String(file));
          } else if (typeof argv.proto_path === "string") {
            argv.proto_path = [argv.proto_path]; // Ha csak egy érték van, tömbbe tesszük
          }
          for (const protoPath of argv.proto_path) {
            if (!fs.existsSync(protoPath)) {
              errors.push(`Not valid proto_path argument:'${protoPath}'\n`);
              continue;
            }
            if (path.isAbsolute(protoPath)) {
              ret.proto_path.push(protoPath);
            } else {
              ret.proto_path.push(path.join(process.cwd(), protoPath));
            }
          }
          if (!ret.proto_path.length) {
            errors.push("\tMissing valid argument '--proto_path='\n");
          }
          break;
        case "_":
          if (Array.isArray(argv._)) {
            argv._ = argv._.map((file) => String(file));
          } else if (typeof argv._ === "string") {
            argv._ = [argv._];
          }
          // if *.proto is in the parameter, all files are required
          for (const file of argv._) {
            if (file.includes("*")){
              const files = fs.readdirSync(path.dirname(file)).filter((f) => f.endsWith(".proto"));
              ret.proto_files = ret.proto_files.concat(files);
            }else{
              ret.proto_files.push(file);
            }
          }
          if (!ret.proto_files.length) {
            errors.push("\tMissing valid argument filename\n");
          }
          break;
        case "I":
          break;
        case "o":
          break;
        default:
          errors.push(`Invalid argument ${key} = ${argv[key]}`);
      }
    }
  } catch (err) {
    console.error(err.toString());
    console.error("FATAL ERROR  in sqlite3_pb_ext_gen: #dXC8zd\n");
    console.log(fs.readFileSync(path.join(__dirname, "../assets/help.txt"), "utf-8"));
    process.exit(1);
  }

  if (errors.length > 0) {
    errors.forEach((err) => {
      console.error(err);
    });
    console.error("FATAL ERROR  in sqlite3_pb_ext_gen: #qYKsS9\n");
    console.log(fs.readFileSync(path.join(__dirname, "../assets/help.txt"), "utf-8"));
    process.exit(0);
  } else {
    return ret;
  }
}
module.exports = processArgsValidator;
