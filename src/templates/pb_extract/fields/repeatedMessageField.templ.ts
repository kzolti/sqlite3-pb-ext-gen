const field_repeated_message_template = (`//    BEGIN repeatedMessageField template
int PbExtract::{{funcName}}(sqlite3_context *ctx, const google::protobuf::Message *message, const int &repeatedIndex, std::vector<std::string> pathsVector, FieldInfo *fieldInfo){
    int ret=SQLITE_ERROR;
    const {{packageMessageCType}} *m=static_cast<const {{packageMessageCType}}*>(message);
    if (ctx ){
        if(repeatedIndex >= 0 && repeatedIndex < m->{{field_type.name}}_size()){
            const {{subMessageCppType}} &subMessage=m->{{field_type.name}}(repeatedIndex);
            pathsVector.erase(pathsVector.cbegin());
            if(pathsVector.empty()){
                if(fieldInfo){                   // vtable
                    if (fieldInfo->repeated){    // pb_each  repeated and repeated_size inicialized in PbEach::xFilter first called pbExtract::{{funcName}}  
                        sqlite3_result_pointer(ctx, const_cast<{{subMessageCppType}} *>(&subMessage) , "{{subMessageType}}", NULL);
                        ret = SQLITE_OK;
                    } else{                      // pb_field
                        //fieldInfo is not inicialized likely called pb_each.field={{field_type.name}}(index)
                        throw std::invalid_argument("{{subMessageType}} is repeated message. Use it pb_each field='{{field_type.name}}'. Do ot use it field='{{field_type.name}}(int index)' in pb_each or pb_field");
                    } 
                }else{
                    throw std::invalid_argument("{{subMessageType}} is message type. Message cannot be printed or you can use it 'messageName.DebugString' ");
                }
            }else{
                std::string method_name;
                int index = -1;
                parseToken(pathsVector.front(), method_name,index);
                auto it=messageFieldFuncMap.find("{{subMessageCamelCaseName}}_" + method_name);
                if(it==messageFieldFuncMap.end()){
                    if (method_name =="DebugString"){
                        sqlite3_result_text(ctx, subMessage.DebugString().c_str(), subMessage.DebugString().size(), SQLITE_TRANSIENT);
                        ret = SQLITE_OK;
                    }else{
                        throw std::invalid_argument("Not found '"+method_name+"' field in " + subMessage.GetTypeName().c_str());
                    }
                }else{
                    ret = std::invoke(it->second,ctx, &subMessage, index, pathsVector, fieldInfo);
                }
            }
        }else{
            throw std::invalid_argument("Not valid repeated field index in " + m->GetTypeName() + ".{{field_type.name}}(" + std::to_string(repeatedIndex) + ") use pb_each instead");
        }
    }else{
        if( fieldInfo && repeatedIndex==-1){
            /* pb_each::xFilter hívta meg ctx nélkül */
            fieldInfo->repeated_size=m->{{field_type.name}}_size();
            fieldInfo->repeated=true;
            fieldInfo->name="{{field_type.name}}";
            fieldInfo->number={{field_type.number}};
            fieldInfo->label="{{label}}";
            fieldInfo->type="{{type}}";
            fieldInfo->type_name="{{subMessageType}}";
            ret = SQLITE_OK;   
        }else{
            std::cerr<<"h2e53a sqlite3_ctx is null or repeated_index !=-1 wrong call from vtable xFilter {{packageMessageCType}}->{{field_type.name}} ";
            throw std::runtime_error("h2e53a sqlite3_ctx is null or repeated_index !=-1 wrong call from vtable xFilter {{packageMessageCType}}->{{field_type.name}} ");
        }
    }
    return ret;
}
//    END repeatedMessageField template                
`);

export default field_repeated_message_template;