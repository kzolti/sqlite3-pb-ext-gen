const template:string=`/*
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
**    For more information, visit: https://github.com/kzolti/sqlite3_pb_ext/
*/

#ifndef PBEXTRACT_H
#define PBEXTRACT_H
#include <google/protobuf/arena.h>
#include <map>
#ifdef SYSTEM_SQLITE
#include <sqlite3ext.h>
#endif
#ifdef CUSTOM_SQLITE
#include "../../sqlite3/src/sqlite3ext.h"
#endif
#include "../common.h"
{{getIncludes}}
SQLITE_EXTENSION_INIT3

using ExtractFunction = int (*)(sqlite3_context*, const google::protobuf::Message*, const int&, std::vector<std::string>, FieldInfo *fieldInfo);
class PbExtract
{
public:
    PbExtract();
    static const google::protobuf::Message* message_inicializator(google::protobuf::Arena &arena, const std::string &blob, const std::string &message_type_name);
    static int extract(sqlite3_context *ctx, const google::protobuf::Message *message, const std::string &messageTypeName, const std::string &fieldPath, FieldInfo *fieldInfo=nullptr);
    static int extract(sqlite3_context *ctx, const std::string &blob_data, const std::string &messageTypeName, const std::string &fieldPath, FieldInfo *fieldInfo=nullptr);

private:
    static inline std::vector<std::string> split(const std::string& s, char delimiter) ;
    static inline void parseToken(const std::string& token, std::string& method_name, int & index) ;

    static const std::unordered_map<std::string, const google::protobuf::Message* (*)(google::protobuf::Arena&, const std::string&)> messageInicializatorMap ;

    static const std::unordered_map<std::string, ExtractFunction> messageFieldFuncMap;
    
    //    init messages
{{getInitMessagesH}}

    //    fields
{{getFieldsH}}
};

#endif // PBEXTRACT_H`

export default template;