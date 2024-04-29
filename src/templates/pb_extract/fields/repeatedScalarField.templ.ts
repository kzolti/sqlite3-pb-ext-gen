const field_repeated_scalar_template = (`//    BEGIN repeated scalar field template
int PbExtract::{{funcName}}(sqlite3_context *ctx, const google::protobuf::Message *message, const int &repeatedIndex, std::vector<std::string> pathsVector, FieldInfo *fieldInfo){
    const {{packageMessageCType}} *m=static_cast<const {{packageMessageCType}}*>(message);
    if(ctx){    
        if (repeatedIndex >= 0 && repeatedIndex < m->{{field_type.name}}_size()){
            {{sqlite3_resultRow}}
            return SQLITE_OK;
        }else{
            throw std::invalid_argument(" Not valid repeated field index in {{packageMessageType}}.{{field_type.name}}("+ std::to_string(repeatedIndex) +") /* {{field_type.name}}_size()==" + std::to_string(m->{{field_type.name}}_size()) + " */");
        }
    }else{
        if( fieldInfo && repeatedIndex ==-1){
            fieldInfo->repeated_size=m->{{field_type.name}}_size();
            fieldInfo->repeated=true;
            fieldInfo->name = "{{field_type.name}}";
            fieldInfo->number = {{field_type.number}};
            fieldInfo->label = "{{label}}";
            fieldInfo->type = "{{type}}";
            {{#if enumTypeName}} 
            fieldInfo->type_name = {{enumTypeName}};
            {{/if}}
            return SQLITE_OK;
        }else{
            std::cerr<<"ea92f48 sqlite3_ctx is null or repeated_index !=-1 wrong call from vtable xFilter {{packageMessageCType}}->{{field_type.name}} ";std::cerr<<"ea92f48 sqlite3_ctx is not valid  tutorial::Person->{{field_type.name}} ";
            throw std::runtime_error("ea92f48 sqlite3_ctx is null or repeated_index !=-1 wrong call from vtable xFilter {{packageMessageCType}}->{{field_type.name}} ");
        }
    } 
}
//    END repeated scalar field template    
    `);
export default field_repeated_scalar_template;
