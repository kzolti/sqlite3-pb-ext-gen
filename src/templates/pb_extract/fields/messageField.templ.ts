const field_message_template = (`//    BEGIN message template
int PbExtract::{{funcName}}(sqlite3_context *ctx, const google::protobuf::Message *message, const int &repeatedIndex, std::vector<std::string> pathsVector, FieldInfo *fieldInfo){
    int ret = SQLITE_ERROR;
    if (repeatedIndex ==-1){
    const {{packageMessageCType}} *m=static_cast<const {{packageMessageCType}}*>(message);
    const {{subMessageCppType}} &subMessage=m->{{field_type.name}}();
        pathsVector.erase(pathsVector.cbegin());
        if(pathsVector.empty()){
            if(fieldInfo){
                {{subMessageCppType}} *retMess=new {{subMessageCppType}}();
                retMess->CopyFrom(subMessage);
                if (ctx) {
                    sqlite3_result_pointer(ctx, retMess , "{{subMessageType}}",
                                                        NULL);
                    //    [](void* ptr) {delete static_cast<{{subMessageCppType}}*>(ptr);}  // then the arena deletes it
                    //);
                }else{
                    fieldInfo->name="{{field_type.name}}";    
                    fieldInfo->number={{field_type.number}};
                    fieldInfo->label="{{label}}";
                    fieldInfo->type="{{type}}";
                    fieldInfo->type_name="{{subMessageType}}";    
                }
                ret=SQLITE_OK;
            }else{
                throw std::invalid_argument("{{subMessageType}} is message type. Message cannot be printed or you can use it 'messageName.DebugString' ");
            }
        }else{
            std::string method_name;
            int index = -1;
            parseToken(pathsVector.front(),method_name,index);
            auto it=messageFieldFuncMap.find("{{subMessageCamelCaseName}}_" + method_name);
            if(it==messageFieldFuncMap.end()){
                if (method_name =="DebugString"){
                    sqlite3_result_text(ctx, subMessage.DebugString().c_str(), subMessage.DebugString().size(), SQLITE_TRANSIENT);
                    ret = SQLITE_OK;
                }else{
                    throw std::invalid_argument("Not found '"+method_name+"' field in " + std::string(subMessage.GetTypeName()));
                }
            }else{
                ret = std::invoke(it->second,ctx, &subMessage, index, pathsVector, fieldInfo);
            }
        }
    }else{
        throw std::invalid_argument("the field('{{field_type.name}}') is non-repeating");
    }
    return ret;
}
//    END message template    
`);
export default field_message_template;