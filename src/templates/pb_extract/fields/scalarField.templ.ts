const field_scalar_template = (`//    BEGIN scalar field template
int PbExtract::{{funcName}}(sqlite3_context *ctx, const google::protobuf::Message *message, const int &repeatedIndex, std::vector<std::string> pathsVector, FieldInfo *fieldInfo){
    int ret = SQLITE_ERROR;
        if (pathsVector.size()==1 && repeatedIndex ==-1){
            const {{packageMessageCType}} *m=static_cast<const {{packageMessageCType}}*>(message);
            if (ctx) {
                {{sqlite3_resultRow}}
            }    
            if (fieldInfo){
                fieldInfo->name = "{{field_type.name}}";
                fieldInfo->number = {{field_type.number}};
                fieldInfo->label = "{{label}}";
                fieldInfo->type = "{{type}}";
                {{#if enumTypeName}} 
                fieldInfo->type_name = {{enumTypeName}};
                {{/if}}
            }
            ret = SQLITE_OK;
        }else{
            throw std::invalid_argument("the field('{{field_type.name}}') has no children or is a non-repeating field");
        }
    return ret;
}
//    END scalar field template    
`);
export default field_scalar_template;