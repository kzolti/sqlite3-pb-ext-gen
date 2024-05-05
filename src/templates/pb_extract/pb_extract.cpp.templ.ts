const template=`/*
**    This C++ source code is generated.
**    Please refrain from editing this file manually.
**
**    Generator Information:
**    ----------------------
**    Name: {{name}}
**    Version: {{version}}
**    Author: {{author}}
**
**    Description: {{description}}
**
**    For more information, visit: https://github.com/kzolti/sqlite3-pb-ext-gen/
*/

#include "pbExtract.h"
#include <functional>
#include <sstream>

std::vector<std::string> PbExtract::split(const std::string &s, char delimiter)
{
    std::vector<std::string> tokens;
    std::stringstream ss(s);
    std::string token;
    while (std::getline(ss, token, delimiter)) {
        tokens.push_back(token);
    }
    return tokens;
}

void PbExtract::parseToken(const std::string &token, std::string &method_name, int &index)
{
    size_t open_bracket_pos = token.find_first_of("(["); // Az első nyitó zárójel vagy szögletes zárójel pozíciója
    if (open_bracket_pos == std::string::npos) {
        // Ha nincs nyitó zárójel vagy szögletes zárójel, akkor nincs szükség indexre
        method_name = token;
        return;
    } else {
        char close_bracket_char;
        if (token[open_bracket_pos] == '(') {
            close_bracket_char = ')';
        } else if (token[open_bracket_pos] == '[') {
            close_bracket_char = ']';
        } else {
            throw std::runtime_error("Invalid token from path: '" + token+ "'");
        }
        size_t close_bracket_pos = token.find_first_of(close_bracket_char, open_bracket_pos); // A nyitó zárójel vagy szögletes zárójel záró párjának pozíciója
        if (close_bracket_pos == std::string::npos) {
            // Ha nincs záró pár, akkor hibát kell dobni
            throw std::runtime_error("Invalid token from path: '" + token + "'");
        }
        if (close_bracket_pos == open_bracket_pos + 1) {
            // Ha a nyitó és záró zárójel vagy szögletes zárójel között nincs érték, akkor az index változó értéke -1
            if (token[open_bracket_pos] == '[' || token[open_bracket_pos] == ']') {
                throw std::runtime_error("Invalid token from path: '" + token + "'");
            }
            method_name = token.substr(0, open_bracket_pos);
        } else {
            // Ha van érték a zárójelek vagy szögletes zárójelek között, akkor azt az index változóban kell eltárolni
            method_name = token.substr(0, open_bracket_pos);
            std::string index_str = token.substr(open_bracket_pos + 1, close_bracket_pos - open_bracket_pos - 1);
            try {
                index = std::stoi(index_str);
            } catch (const std::invalid_argument &e) {
                throw std::runtime_error("Invalid index value in path: '" + token + "'");
            }

        }
    }
}

const std::unordered_map<std::string, const google::protobuf::Message* (*)(google::protobuf::Arena&, const std::string&)> PbExtract::messageInicializatorMap = {
    {{getMessageInicializatorFuncNames}}
};
  
  const std::unordered_map<std::string, ExtractFunction> PbExtract::messageFieldFuncMap = {
    {{getMessageFieldFunctions}}
} ;

{{getCppInitFunc}}

{{getFieldsCppFunc}}

  int PbExtract::extract(sqlite3_context *ctx, const std::string &blob_data, const std::string &messageTypeName, const std::string &fieldPath, FieldInfo *fieldInfo)
{
    int ret = SQLITE_ERROR;
    try {
        google::protobuf::Arena arena;
        std::string message_type_name = messageTypeName;
        std::replace( message_type_name.begin(), message_type_name.end(), '.', '_');
        const auto iter=messageInicializatorMap.find(message_type_name+"__init");
        if (iter==messageInicializatorMap.end()){
            throw std::invalid_argument(" Not valid message type:'" + messageTypeName + "'");
        }else{
            const google::protobuf::Message *mess=std::invoke(iter->second,arena, blob_data);
            const std::string paths = (fieldPath.substr(0, 2) == "$.") ? fieldPath.substr(2) : fieldPath;
            std::vector<std::string> pathsVector = split(paths, '.');
            if(!pathsVector.empty()){
                std::string method_name;
                int index = -1;
                parseToken(pathsVector.front(),method_name,index);
                const auto it=messageFieldFuncMap.find(message_type_name+"_"+method_name);
                if (it==messageFieldFuncMap.end()){
                    throw std::invalid_argument(" Not valid function: " + method_name + " on " + messageTypeName );
                }else{
                    ret = std::invoke(it->second,ctx, mess, index, pathsVector, fieldInfo);
                }
            }else{
                throw std::invalid_argument("Invalid field, path is empty: " + paths);
            }
        }

    }  catch (const std::exception& e) {
        if(ctx){
          sqlite3_result_error(ctx, sqlite3_mprintf("pb_extract:(%s.%s, %s) | %s",messageTypeName.c_str(), fieldPath.c_str(), e.what()), -1);
        }else{
            fieldInfo->err = "pb_extract:(" + messageTypeName + "." + fieldPath + " | " +  e.what();
        }
    }
    return ret;
}
const google::protobuf::Message *PbExtract::message_inicializator(google::protobuf::Arena &arena, const std::string &blob, const std::string &message_type_name){
    std::string _message_type_name=message_type_name;
    std::replace( _message_type_name.begin(), _message_type_name.end(), '.', '_');
    const auto iter=messageInicializatorMap.find(_message_type_name+"__init");
    if (iter==messageInicializatorMap.end()){
        return nullptr;
    }else{
        return std::invoke(iter->second,arena, blob);
    }
}
int PbExtract::extract(sqlite3_context *ctx, const google::protobuf::Message *message, const std::string &messageTypeName, const std::string &fieldPath, FieldInfo *fieldInfo)
{
    int ret = SQLITE_ERROR;
    try{
        std::string message_type_name = messageTypeName;
        std::replace( message_type_name.begin(), message_type_name.end(), '.', '_');
        const std::string paths = (fieldPath.substr(0, 2) == "$.") ? fieldPath.substr(2) : fieldPath;
        std::vector<std::string> pathsVector = split(paths, '.');
        if(!pathsVector.empty()){
            std::string method_name;
            int index = -1;
            parseToken(pathsVector.front(),method_name,index);
            const auto it=messageFieldFuncMap.find(message_type_name+"_"+method_name);
            if (it==messageFieldFuncMap.end()){
                throw std::invalid_argument(" Not valid function: " + method_name + " on " + messageTypeName );
            }else{
                ret = std::invoke(it->second,ctx, message, index, pathsVector, fieldInfo);
            }
        }else{
            throw std::invalid_argument("Invalid field, path is empty: " + paths);
        }
    }  catch (const std::exception& e) {
        if(ctx){
            sqlite3_result_error(ctx, sqlite3_mprintf("pb_extract:(%s.%s, %s) | %s",messageTypeName.c_str(), fieldPath.c_str(), e.what()), -1);
        }else{
            fieldInfo->err = "pb_extract:(" + messageTypeName + "." + fieldPath + " | " +  e.what();
        }
    }
    return ret;
}
`;
export default template;