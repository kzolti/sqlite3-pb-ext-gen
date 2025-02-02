import { FileDescriptorSet, FileDescriptorProto, DescriptorProto, FieldDescriptorProto } from "google-protobuf/google/protobuf/descriptor_pb";
import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import pb_extract_h_template from "./templates/pb_extract/pb_extract.h.templ";
import pb_extract_cpp_template from "./templates/pb_extract/pb_extract.cpp.templ";
import field_repeated_message_template from "./templates/pb_extract/fields/repeatedMessageField.templ";
import field_message_template from "./templates/pb_extract/fields/messageField.templ";
import field_repeated_scalar_template from "./templates/pb_extract/fields/repeatedScalarField.templ";
import field_scalar_template from "./templates/pb_extract/fields/scalarField.templ";
import * as readline from 'readline';
import * as package_json from "../package.json";
class PbExtractGenerator {
  private _generateOutPath: string = "";
  private _requestedFiles: Array<FileDescriptorProto>;
  private _includedFiles: Array<FileDescriptorProto>;
  private _includedGoogleFiles: Array<FileDescriptorProto>;
  private _isNestedMessage: boolean;
  private _messageInicializatorFuncNames: Set<string> = new Set();
  private _addedMessages: Array<string> = []; // getMessageFieldFunc ebben gyüjt
  private _messageFieldFunctions: Map<string, { func_name: string; package_name: string; message_type: DescriptorProto }> = new Map();

  constructor(
    requestedFiles: Array<FileDescriptorProto>,
    includedFiles: Array<FileDescriptorProto>,
    includedGoogleFiles: Array<FileDescriptorProto>,
    generateOutPath: string,
    isNestedMessage: boolean
  ) {
    this._requestedFiles = requestedFiles;
    this._includedFiles = includedFiles;
    this._includedGoogleFiles = includedGoogleFiles;
    this._generateOutPath = generateOutPath;
    this._isNestedMessage = isNestedMessage;
    this.renderHFile();
    this.renderCppFile();
  }
  private _checkFieldName = (fieldName: string): string => {
    const cKeywords = [
      "NULL",
      "alignas",
      "alignof",
      "and",
      "and_eq",
      "asm",
      "auto",
      "bitand",
      "bitor",
      "bool",
      "break",
      "case",
      "catch",
      "char",
      "class",
      "compl",
      "const",
      "constexpr",
      "const_cast",
      "continue",
      "decltype",
      "default",
      "delete",
      "do",
      "double",
      "dynamic_cast",
      "else",
      "enum",
      "explicit",
      "export",
      "extern",
      "false",
      "float",
      "for",
      "friend",
      "goto",
      "if",
      "inline",
      "int",
      "long",
      "mutable",
      "namespace",
      "new",
      "noexcept",
      "not",
      "not_eq",
      "nullptr",
      "operator",
      "or",
      "or_eq",
      "private",
      "protected",
      "public",
      "register",
      "reinterpret_cast",
      "return",
      "short",
      "signed",
      "sizeof",
      "static",
      "static_assert",
      "static_cast",
      "struct",
      "switch",
      "template",
      "this",
      "thread_local",
      "throw",
      "true",
      "try",
      "typedef",
      "typeid",
      "typename",
      "union",
      "unsigned",
      "using",
      "virtual",
      "void",
      "volatile",
      "wchar_t",
      "while",
      "xor",
      "xor_eq",
    ];
    if (cKeywords.includes(fieldName)) {
      return fieldName + "_";
    } else {
      return fieldName;
    }
  };
  private _addMessageFieldFunction(func_name: string, package_name: string, message_type: DescriptorProto): void {
    const key = func_name;
    const value = { func_name, package_name, message_type };

    this._messageFieldFunctions.set(key, value);
  }
  private _getMessageFieldFunctions(): Array<{ func_name: string; package_name: string; message_type: DescriptorProto }> {
    return Array.from(this._messageFieldFunctions.values());
  }
  private getIncludes(): string {
    let ret: Array<string> = [];
    this._requestedFiles.forEach((fDesc) => {
      ret.push(`#include "pb/${fDesc.getName().replace(".proto", ".pb.h")}"`);
    });
    return ret.join("\n");
  }
  private getInitMessagesHFunc() {
    const templ: string = "    static const google::protobuf::Message* messageInicializatorFuncName(google::protobuf::Arena &arena, const std::string &blob);";
    let ret: Set<string> = new Set();
    const nestedMessages = (message_type: DescriptorProto) => {
      for (const field_type of message_type.getFieldList()) {
        if (field_type.getType() === FieldDescriptorProto.Type.TYPE_MESSAGE) {
          //message
          const messageType = field_type.getTypeName().startsWith(".") ? field_type.getTypeName().slice(1) : field_type.getTypeName();
          const funcName = `${messageType.replaceAll(".", "_")}__init`;
          this._messageInicializatorFuncNames.add(funcName);
          ret.add(`${templ.replace("messageInicializatorFuncName", funcName)}`);
        }
      }
    };
    for (const fDesc of this._requestedFiles) {
      const package_name: string = fDesc.getPackage();
      for (const message_type of fDesc.getMessageTypeList()) {
        const funcName = `${package_name}_${message_type.getName()}__init`;
        this._messageInicializatorFuncNames.add(funcName);
        ret.add(`${templ.replace("messageInicializatorFuncName", funcName)}`);
        if (this._isNestedMessage) {
          nestedMessages(message_type);
        }
      }
    }
    return Array.from(ret).join("\n");
  }
  private getFieldsHFunc(): string {
    let ret: Set<string> = new Set();
    const getMessageFieldFunc = (package_name: string, message_type: DescriptorProto) => {
      if (this._addedMessages.includes(`.${package_name}.${message_type.getName()}`)) {
        console.error("FATAL ERROR  in generator_ts: #rW7y7w");
        process.exit(1);
      }
      this._addedMessages.push(`.${package_name}.${message_type.getName()}`);
      for (const field_type of message_type.getFieldList()) {
        const func_name = `${package_name}_${message_type.getName()}_${this._checkFieldName(field_type.getName())}`.replaceAll(".", "_");
        this._addMessageFieldFunction(func_name, package_name, message_type);
        ret.add(
          `    static int ${func_name}(sqlite3_context *ctx, const google::protobuf::Message *message, const int &repeatedIndex, std::vector<std::string> pathsVector, FieldInfo *fieldInfo=nullptr);`
        );
        if (field_type.getType() === FieldDescriptorProto.Type.TYPE_MESSAGE) {
          let subMessageType = field_type.getTypeName();
          if (subMessageType.startsWith(".")) {
            subMessageType = subMessageType.slice(1); // Eltávolítja az első pontot
          }
          let mtype = message_type.getNestedTypeList().find((e) => field_type.getTypeName().endsWith("." + e.getName()));
          if (!mtype) {
            for (const fDesc of this._requestedFiles) {
              mtype = fDesc.getMessageTypeList().find((e) => {
                return field_type.getTypeName() === `.${fDesc.getPackage()}.${e.getName()}`;
              });
              if (mtype) {
                break;
              }
            }
          }
          if (!mtype) {
            for (const fDesc of this._includedFiles) {
              //mtype = fDesc.getMessageTypeList().find(e => field_type.getTypeName().endsWith("." + e.getName()));
              mtype = fDesc.getMessageTypeList().find((e) => {
                //console.log(e.getName());
                return field_type.getTypeName().endsWith("." + e.getName());
              });
              if (mtype) {
                break;
              }
            }
          }
          if (!mtype) {
            for (const fDesc of this._includedGoogleFiles) {
              mtype = fDesc.getMessageTypeList().find((e) => {
                return field_type.getTypeName() === ".google.protobuf." + e.getName();
              });
              if (mtype) {
                break;
              }
            }
          }
          if (!mtype) {
            console.error("#lQvOCp  Message not found:", field_type.getTypeName());
            console.error("FATAL ERROR  in generator_ts: #jmGAyw");
            process.exit(1);
          } else {
            //console.log("tick", field_type.getTypeName());
          }
          let nestedMessagePackageName = field_type.getTypeName().substring(0, field_type.getTypeName().lastIndexOf("." + mtype.getName()));
          if (nestedMessagePackageName.startsWith(".")) {
            nestedMessagePackageName = nestedMessagePackageName.slice(1); // Eltávolítja az első pontot
          }
          if (!this._addedMessages.includes(`.${nestedMessagePackageName}.${mtype.getName()}`)) {
            getMessageFieldFunc(nestedMessagePackageName, mtype);
          }
        }
      }
    };
    const descriptors: Array<FileDescriptorProto> = this._requestedFiles.concat(this._includedFiles).concat(this._includedGoogleFiles);
    for (const fDesc of descriptors) {
      const package_name: string = fDesc.getPackage();
      for (const message_type of fDesc.getMessageTypeList()) {
        if (!this._addedMessages.includes(`.${package_name}.${message_type.getName()}`)) {
          getMessageFieldFunc(package_name, message_type);
        }
      }
    }
    return Array.from(ret).join("\n");
  }
  private renderHFile() {
    Handlebars.registerHelper("getIncludes", () => {
      return this.getIncludes();
    });
    Handlebars.registerHelper("getInitMessagesH", () => {
      return this.getInitMessagesHFunc();
    });
    Handlebars.registerHelper("getFieldsH", () => {
      return this.getFieldsHFunc();
    });
    var templateScript = Handlebars.compile(pb_extract_h_template, { noEscape: true });
    fs.writeFileSync(path.join(this._generateOutPath, "pbExtract.h"), templateScript(package_json), "utf-8");
  }

  private getCppInitFunc(): string {
    let ret: Set<string> = new Set();
    const templ = `const google::protobuf::Message *PbExtract::messageInicializatorFuncName(google::protobuf::Arena &arena, const std::string &blob){
    package::Message* ret = google::protobuf::Arena::Create<package::Message>(&arena);
    ret->ParseFromArray(blob.c_str(),blob.size());
    return ret;
}`;
    const nestedMessages = (message_type: DescriptorProto) => {
      for (const field_type of message_type.getFieldList()) {
        if (field_type.getType() === FieldDescriptorProto.Type.TYPE_MESSAGE) {
          //message
          const messageType = field_type.getTypeName().startsWith(".") ? field_type.getTypeName().slice(1) : field_type.getTypeName();
          const funcStr: string = `${templ.replace("messageInicializatorFuncName", `${messageType.replaceAll(".", "_")}__init`)}`;
          ret.add(funcStr.replaceAll("package::Message", `${messageType.replaceAll(".", "::")}`));
        }
      }
    };
    for (const fDesc of this._requestedFiles) {
      const package_name: string = fDesc.getPackage();
      for (const message_type of fDesc.getMessageTypeList()) {
        const funcName = `${package_name}_${message_type.getName()}__init`;
        let funcStr = templ.replace("messageInicializatorFuncName", funcName).replaceAll("package::Message", `${package_name}::${message_type.getName()}`);
        ret.add(funcStr);
        if (this._isNestedMessage) {
          nestedMessages(message_type);
        }
      }
    }
    return Array.from(ret).join("\n");
  }

  private getFieldsCppFunc(): string {
    let ret: Set<string> = new Set();
    const getFieldFunc = (package_name: string, message_type: DescriptorProto) => {
      for (const field_type of message_type.getFieldList()) {
        const funcName = `${package_name}_${message_type.getName()}_${this._checkFieldName(field_type.getName())}`.replaceAll(".", "_");
        const packageMessageCType = `${package_name.replaceAll(".", "::")}::${message_type.getName()}`;
        const label = Object.keys(FieldDescriptorProto.Label)
          .find((e) => FieldDescriptorProto.Label[e] === field_type.getLabel())
          .replace("LABEL_", "")
          .toLowerCase();
        const type = Object.keys(FieldDescriptorProto.Type)
          .find((e) => FieldDescriptorProto.Type[e] === field_type.getType())
          .replace("TYPE_", "")
          .toLowerCase();
        const template_vars = {
          funcName: funcName,
          packageMessageType: `${package_name}.${message_type.getName()}`,
          packageMessageCType: packageMessageCType,
          field_type: field_type.toObject(),
          label: label,
          type: type,
        };
        if (field_type.getType() === FieldDescriptorProto.Type.TYPE_MESSAGE) {
          //message
          const subMessageType = field_type.getTypeName().startsWith(".") ? field_type.getTypeName().slice(1) : field_type.getTypeName();
          let subMessageCamelCaseName = subMessageType.replaceAll(".", "_");
          const message_template_vars = {
            ...template_vars,
            subMessageType: subMessageType,
            subMessageCppType: subMessageType.replaceAll(".", "::"),
            subMessageCamelCaseName: subMessageCamelCaseName,
          };
          if (field_type.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED) {
            var templateScript = Handlebars.compile(field_repeated_message_template, { noEscape: true });
            ret.add(templateScript(message_template_vars));
          } else {
            // not repeated message
            var templateScript = Handlebars.compile(field_message_template, { noEscape: true });
            ret.add(templateScript(message_template_vars));
          }
        } else {
          let sqlite3_resultRow: string = "";
          let enumTypeName = "";
          const repeatedIndexStr = field_type.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED ? "repeatedIndex" : "";
          switch (field_type.getType()) {
            case FieldDescriptorProto.Type.TYPE_ENUM: {
              const typeName = field_type.getTypeName().startsWith(".") ? field_type.getTypeName().slice(1) : field_type.getTypeName();
              const cppTypeName = typeName.replaceAll(".", "::");
              sqlite3_resultRow = `sqlite3_result_int(ctx, m->${this._checkFieldName(field_type.getName())}(${repeatedIndexStr}));`;
              enumTypeName = `"${typeName}." + ${cppTypeName}_Name(m->${this._checkFieldName(field_type.getName())}(${repeatedIndexStr}))`;
              break;
            }
            case FieldDescriptorProto.Type.TYPE_BYTES:
              sqlite3_resultRow = `sqlite3_result_blob(ctx, m->${this._checkFieldName(field_type.getName())}(${repeatedIndexStr}).c_str(), m->${this._checkFieldName(
                field_type.getName()
              )}(${repeatedIndexStr}).size(), SQLITE_TRANSIENT);`;
              break;
            case FieldDescriptorProto.Type.TYPE_FIXED32:
            case FieldDescriptorProto.Type.TYPE_BOOL:
            case FieldDescriptorProto.Type.TYPE_INT32:
            case FieldDescriptorProto.Type.TYPE_SFIXED32:
            case FieldDescriptorProto.Type.TYPE_SINT32:
            case FieldDescriptorProto.Type.TYPE_UINT32:
              sqlite3_resultRow = `sqlite3_result_int(ctx, m->${this._checkFieldName(field_type.getName())}(${repeatedIndexStr}));`;
              break;
            case FieldDescriptorProto.Type.TYPE_FIXED64:
            case FieldDescriptorProto.Type.TYPE_INT64:
            case FieldDescriptorProto.Type.TYPE_SFIXED64:
            case FieldDescriptorProto.Type.TYPE_SINT64:
            case FieldDescriptorProto.Type.TYPE_UINT64:
              sqlite3_resultRow = `sqlite3_result_int64(ctx, m->${this._checkFieldName(field_type.getName())}(${repeatedIndexStr}));`;
              break;
            case FieldDescriptorProto.Type.TYPE_DOUBLE:
            case FieldDescriptorProto.Type.TYPE_FLOAT:
              sqlite3_resultRow = `sqlite3_result_double(ctx, m->${this._checkFieldName(field_type.getName())}(${repeatedIndexStr}));`;
              break;
            case FieldDescriptorProto.Type.TYPE_STRING:
              sqlite3_resultRow = `sqlite3_result_text(ctx, m->${this._checkFieldName(field_type.getName())}(${repeatedIndexStr}).c_str(), m->${this._checkFieldName(
                field_type.getName()
              )}(${repeatedIndexStr}).size(), SQLITE_TRANSIENT);`;
              break;
            default:
              break;
          }
          const scalar_template_vars = {
            ...template_vars,
            sqlite3_resultRow: sqlite3_resultRow,
            enumTypeName,
          };
          if (field_type.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED) {
            var templateScript = Handlebars.compile(field_repeated_scalar_template, { noEscape: true });
            ret.add(templateScript(scalar_template_vars));
          } else {
            var templateScript = Handlebars.compile(field_scalar_template, { noEscape: true });
            ret.add(templateScript(scalar_template_vars));
          }
        }
      }
    };
    const messageFieldFunctions = Array.from(this._getMessageFieldFunctions());
    process.stdout.write('sqlite3_pb_ext_gen: Creating source code ');
    for (let i = 0; i < messageFieldFunctions.length; i++) {
      const func = messageFieldFunctions[i];
      getFieldFunc(func.package_name, func.message_type);
      if ((i + 1) % 10 === 0) {
        const percentage = ((i + 1) / messageFieldFunctions.length) * 100;
        // readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 41, null);
        process.stdout.write(`${percentage.toFixed(0)} %`);
      }
    }
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0, null);
    console.log("sqlite3_pb_ext_gen: Creating source code 100 %");
    
    return Array.from(ret).join("\n");
  }

  private renderCppFile() {
    Handlebars.registerHelper("getMessageInicializatorFuncNames", () => {
      return Array.from(this._messageInicializatorFuncNames)
        .map((func_name) => `{"${func_name}", &${func_name}}`)
        .join(",\n    ");
    });
    Handlebars.registerHelper("getMessageFieldFunctions", () => {
      return Array.from(this._getMessageFieldFunctions())
        .map((e) => `{"${e.func_name}", &${e.func_name}}`)
        .join(",\n    ");
    });
    Handlebars.registerHelper("getCppInitFunc", () => {
      return this.getCppInitFunc();
    });
    Handlebars.registerHelper("getFieldsCppFunc", () => {
      return this.getFieldsCppFunc();
    });
    var templateScript = Handlebars.compile(pb_extract_cpp_template, { noEscape: true });
    fs.writeFileSync(path.join(this._generateOutPath, "pbExtract.cpp"), templateScript(package_json), "utf-8");
  }
}
export default PbExtractGenerator;
