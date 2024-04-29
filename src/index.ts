import fs from "fs";
import { DescriptorProto, FieldDescriptorProto, FileDescriptorProto, FileDescriptorSet } from "google-protobuf/google/protobuf/descriptor_pb";
import path from "path";
import { cp, ln, mkdir, rm } from "shelljs";
import Handlebars from "handlebars";
import PbExtractGenerator from "./pb_extract_generator";

interface RetArguments {
  out_path: string;
  proto_path: Array<string>;
  proto_files: Array<string>;
}
const os = require("os");
const processArgsValidator = require("./processArgsValidator");
const { execSync } = require("child_process");

const _assetsPath: string = path.join(__dirname, "..", "assets");
const _extensionCMakeRootFilesPath = path.join(_assetsPath, "extensionCMakePath");

const _args: RetArguments = processArgsValidator(process.argv.slice(2));
const _outPath = _args.out_path;
const _generateOutPath = path.join(_outPath, "src", "gen");
const pbGenerateOutPath = path.join(_generateOutPath, "pb");

const descriptorFileName = path.join(os.tmpdir(), "sqlite3_pb_ext_gen.desc");

const protocCommand = `protoc --include_imports --descriptor_set_out=${descriptorFileName} --cpp_out=${pbGenerateOutPath}  --proto_path=${_args.proto_path
  .map(e=>e).join(" --proto_path=")} ${_args.proto_files.map((e) => e).join(" ")}`;
try {
  // clean and init generate_out dir
  console.log(`sqlite3_pb_ext_gen: clean and init ${_outPath}`);

  rm("-Rf", path.join(_outPath, "src"));
  mkdir("-p", _outPath);
  // copy  only the not exits files
  cp("-Ru", path.join(_extensionCMakeRootFilesPath, "*"), _outPath);
  // create generateProject.cmake vars
  const cmakeTempl_vars = {
    sqlite3_pb_ext_gen_arg: `${_args.proto_files.map(e=>e).join(" ")} --proto_path=${_args.proto_path.map((e) => e).join(" --proto_path=")}`,
    def_glob_my_protos: "",
    depends: "",
  };
  for (let i = 0; i < _args.proto_path.length; i++) {
    cmakeTempl_vars.def_glob_my_protos += `file(GLOB PROTO_FILES_${i} "${_args.proto_path[i]}/*.proto")\n`;
    cmakeTempl_vars.depends += "${PROTO_FILES_" + i + "} ";
  }
  const templateContent:string = fs.readFileSync(path.join(__dirname, "../assets/GenerateProject.cmake.hls"), "utf-8");
  const template:HandlebarsTemplateDelegate = Handlebars.compile(templateContent, { noEscape: true });
  const filledTemplate:string = template(cmakeTempl_vars);
  fs.writeFileSync(path.join(_outPath, "GenerateProject.cmake"), filledTemplate);
  mkdir("-p", pbGenerateOutPath);
  console.log(`sqlite3_pb_ext_gen: run command '${protocCommand}'`);
  execSync(protocCommand, { stdio: "pipe" });
} catch (error) {
  console.error("sqlite3_pb_ext_gen: \t-😕¬\n", error.toString());
  console.error("sqlite3_pb_ext_gen: FATAL ERROR #lzCoa6");
  process.exit(1);
}

console.log(`sqlite3_pb_ext_gen: read descriptor file ${descriptorFileName}`);
const fileDescriptorFile = fs.readFileSync(descriptorFileName);
const fileDescriptorSet: FileDescriptorSet = FileDescriptorSet.deserializeBinary(fileDescriptorFile);
const requestedFiles: Array<FileDescriptorProto> = [];
const includedFiles: Array<FileDescriptorProto> = [];
const includedGoogleFiles: Array<FileDescriptorProto> = [];
const generatedFilesTxt: Array<string> = [];

for (const descriptor_file of fileDescriptorSet.getFileList()) {
  //if (_args.proto_files.find((e) => e === descriptor_file.getName())) {
  if (_args.proto_files.find((e) => path.basename(e) === descriptor_file.getName())) {
    // If found in argumentums list then requestedFiles.push
    requestedFiles.push(descriptor_file);
    generatedFilesTxt.push(path.relative(_outPath, path.join(pbGenerateOutPath, descriptor_file.getName().replace(".proto", ".pb.h"))));
    generatedFilesTxt.push(path.relative(_outPath, path.join(pbGenerateOutPath, descriptor_file.getName().replace(".proto", ".pb.cc"))));
  } else {
    // included file
    if (descriptor_file.getName().startsWith("google/protobuf/")) {
      // "google/protobuf/*
      if (!includedGoogleFiles.find((e: FileDescriptorProto) => e.getName() === descriptor_file.getName())) includedGoogleFiles.push(descriptor_file);
    } else {
      // other included file
      if (!includedFiles.find((e: FileDescriptorProto) => e.getName() === descriptor_file.getName())) {
        includedFiles.push(descriptor_file);
        generatedFilesTxt.push(path.relative(_outPath, path.join(pbGenerateOutPath, descriptor_file.getName().replace(".proto", ".pb.h"))));
        generatedFilesTxt.push(path.relative(_outPath, path.join(pbGenerateOutPath, descriptor_file.getName().replace(".proto", ".pb.cc"))));
      }
    }
  }
}
if (includedFiles.length){
  try {
    const includedCommandFilesArgs: string = includedFiles.map((e) => path.basename(e.getName())).join(" ");
    const included_files_command: string = `protoc --cpp_out=${pbGenerateOutPath} --proto_path=${_args.proto_path.map((e) => e).join(" --proto_path=")} ${includedCommandFilesArgs}`;
    console.log(`sqlite3_pb_ext_gen: Create proto included files '${included_files_command}'`);
    execSync(included_files_command, { stdio: "pipe" });
  } catch (error) {
    console.error("\n", error.toString());
    console.error("sqlite3_pb_ext_gen: FATAL ERROR #lHp3yU");
    process.exit(1);
  }
}
new PbExtractGenerator(requestedFiles, includedFiles, includedGoogleFiles, _generateOutPath, true);
generatedFilesTxt.push(path.relative(_outPath, path.join(_generateOutPath, "pbExtract.h")));
generatedFilesTxt.push(path.relative(_outPath, path.join(_generateOutPath, "pbExtract.cpp")));
fs.writeFileSync(path.join(_generateOutPath, "generated_files.txt"), generatedFilesTxt.join("\n"), "utf-8");
console.log("sqlite3_pb_ext_gen: generation ended successfully");
console.log("sqlite3_pb_ext_gen: Finish");
process.exit(0);
