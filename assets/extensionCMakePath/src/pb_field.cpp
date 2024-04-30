#include "pb_field.h"
#include "gen/pbExtract.h"
#include <sstream>
//#include <assert.h>
//#include <iostream>



int PbField::xConnect(sqlite3 *db, void *pAux, int argc, const char * const *argv, sqlite3_vtab **ppVtab, char **pzErr){
    sqlite3_vtab *pNew ;
    int rc;

#define _PB_FIELD_COLUMN_VALUE 0
#define _PB_FIELD_COLUMN_NAME 1
#define _PB_FIELD_COLUMN_NUMBER 2
#define _PB_FIELD_COLUMN_LABEL 3
#define _PB_FIELD_COLUMN_TYPE 4
#define _PB_FIELD_COLUMN_TYPE_NAME 5
#define _PB_FIELD_COLUMN_MESSAGE 6
#define _PB_FIELD_COLUMN_MESSAGE_TYPE 7
#define _PB_FIELD_COLUMN_FIELD_PATH 8

// equivalent the MESSAGE
#define _PB_FIELD_COLUMN_M 10

// equivalent the MESSAGE_TYPE
#define _PB_FIELD_COLUMN_MT 11

// equivalent the FIELD_PATH
#define _PB_FIELD_COLUMN_FP 12


// params

#define _PB_FIELD_PARAM_FLAG_NONE 0x0
#define _PB_FIELD_PARAM_FLAG_MESSAGE 0x1
#define _PB_FIELD_PARAM_FLAG_MESSGE_TYPE_NAME 0x2
#define _PB_FIELD_PARAM_FLAG_FIELD_PATH 0x4

    rc = sqlite3_declare_vtab
        (db,
         "CREATE TABLE x( "
         " value /*  */"
         ",name "
         ",number "
         ",label "
         ",type /* scalar type or message , enum, map, any .. */"
         ",type_name /* ugyanaz mint a type, de nem scalar type esetén a proto type pl.:package.MessageName.MyEnum , package.MessageName */"
         ",message HIDDEN"
         ",message_type HIDDEN"
         ",field HIDDEN"
         ",m HIDDEN"
         ",mt HIDDEN"
         ",f HIDDEN"
         ");"
         );
    /* For convenience, define symbolic names for the index to each column. */
    if( rc == SQLITE_OK ){
        pNew = *ppVtab = (sqlite3_vtab*)sqlite3_malloc( sizeof(*pNew) );
        if( pNew == 0 ) {
            return SQLITE_NOMEM;
        }
        memset(pNew, 0, sizeof(*pNew));
    }else{
        *pzErr = sqlite3_mprintf("'%s' create virtual table error in %s ",argv[0], __FUNCTION__);
        rc = SQLITE_ERROR;
    }
    return rc;
}



int PbField::xBestIndex(sqlite3_vtab *tab, sqlite3_index_info *pIdxInfo){
    int rc = SQLITE_OK;
    int nArg = 0;          // Number of arguments
    int required_param_flags = _PB_FIELD_PARAM_FLAG_NONE;  // Bit field to track the presence of required parameters
    int argIndex[4];
    argIndex[0] = argIndex[1] = argIndex[2] = argIndex[3] = -1;
    //    Loop over all constraints to find usable and equal constraints
    const auto *constraint = pIdxInfo->aConstraint;
    for(int i = 0; i < pIdxInfo->nConstraint; i ++, constraint ++) {
        if (constraint->op == SQLITE_INDEX_CONSTRAINT_EQ) {
            //            Set required_param_flags
            switch(constraint->iColumn) {
            case _PB_FIELD_COLUMN_MESSAGE:
            case _PB_FIELD_COLUMN_M:
                argIndex[0] = i;
                required_param_flags |= _PB_FIELD_PARAM_FLAG_MESSAGE;
                break;
            case _PB_FIELD_COLUMN_MESSAGE_TYPE:
            case _PB_FIELD_COLUMN_MT:
                argIndex[1] = i;
                required_param_flags |= _PB_FIELD_PARAM_FLAG_MESSGE_TYPE_NAME;
                break;
            case _PB_FIELD_COLUMN_FIELD_PATH:
            case _PB_FIELD_COLUMN_FP:
                argIndex[2] = i;
                required_param_flags |= _PB_FIELD_PARAM_FLAG_FIELD_PATH;
                break;
            }
        }
    }
    //         If the aConstraint[].usable field is false for one of the required parameter,
    //        then the xBestIndex method should return SQLITE_CONSTRAINT.
    for (int i = 0; i < 4; i++) {
        if (argIndex[i] >= 0 && !pIdxInfo->aConstraint[argIndex[i]].usable) {
            return SQLITE_CONSTRAINT;
        }
    }
    //    Check that all required parameters are present, set an error message if not
    pIdxInfo->idxNum = required_param_flags;
    if ((required_param_flags & 7) != 7){
        tab->zErrMsg = sqlite3_mprintf
            ("missing argument(s):%s %s %s",
             !(required_param_flags & _PB_FIELD_PARAM_FLAG_MESSAGE) ? "'message'" : "",
             !(required_param_flags & _PB_FIELD_PARAM_FLAG_MESSGE_TYPE_NAME) ? "'message_type'":"",
             !(required_param_flags & _PB_FIELD_PARAM_FLAG_FIELD_PATH) ? "'field'" : ""
             );
        return SQLITE_ERROR;
    }
    for(int i = 0; i < 4; i++){
        if( argIndex[i] >= 0 ){
            pIdxInfo->aConstraintUsage[argIndex[i]].argvIndex = ++nArg;
            pIdxInfo->aConstraintUsage[argIndex[i]].omit = 1;
        }
    }

    return SQLITE_OK;

}

int PbField::xFilter(sqlite3_vtab_cursor *pVtabCursor, int idxNum, const char *idxStr, int argc, sqlite3_value **argv){

    x_cursor *pCur = (x_cursor *)pVtabCursor;
    pCur->iRowid = 0;
    int value_type = sqlite3_value_type(argv[0]);
    std::string message_type = std::string(reinterpret_cast<const char*>(sqlite3_value_text(argv[1])),
                                           static_cast<size_t>(sqlite3_value_bytes(argv[1])));
    pCur->message_type = message_type;
    if (value_type == SQLITE_BLOB ){
        //blob
        std::string blob_data = std::string(reinterpret_cast<const char*>(sqlite3_value_blob(argv[0])),
                                            static_cast<size_t>(sqlite3_value_bytes(argv[0])));
        pCur->messagePtr = PbExtract::message_inicializator(pCur->arena, blob_data, message_type);

    }else if (value_type == SQLITE_NULL){
        //it is possible that pointer
        const void *message = sqlite3_value_pointer(argv[0], message_type.c_str());
        if(message != nullptr){
            pCur->messagePtr = message;
        }else{
            pVtabCursor->pVtab->zErrMsg = sqlite3_mprintf("4875de pointer_init_error, not valid message_type:'%s'",message_type.c_str());
            return SQLITE_ERROR;
        }
    }
    std::string field = std::string(reinterpret_cast<const char*>(sqlite3_value_text(argv[2])),
                                    static_cast<size_t>(sqlite3_value_bytes(argv[2])));
    if (field.find('.') != std::string::npos) {
        pCur->base.pVtab->zErrMsg = sqlite3_mprintf("The field('%s') is not valid. Field name cannot contain '.' character", field.c_str());
        return SQLITE_ERROR;
    }else{
        pCur->field_name = field ;
        //init fieldInfo
        int rc;
        if(pCur->field_name.length()){
            rc = PbExtract::extract(nullptr, static_cast<google::protobuf::Message*>(const_cast<void*>(pCur->messagePtr)), pCur->message_type, pCur->field_name, &pCur->field_info);
        }else{
//            pCur->field_info.name = "";
            pCur->field_info.type = "message";
            pCur->field_info.type_name = pCur->message_type;
//            pCur->field_info.label = "optional";
            pCur->field_info.number = -1;
            rc = SQLITE_OK;
        }
        return rc;
    }

}

int PbField::xColumn(sqlite3_vtab_cursor *cur, sqlite3_context *ctx, int i){
    x_cursor *pCur = (x_cursor*)cur;
    FieldInfo &field_info = pCur->field_info;
    //    std::cout<<__FUNCTION__<<" asdf231ads456afsd645"<<std::endl;
    int rc = SQLITE_OK;
    switch( i ){
    case _PB_FIELD_COLUMN_VALUE:{
        if(pCur->field_name.length()){
            rc = PbExtract::extract(ctx, static_cast<google::protobuf::Message*>(const_cast<void*>(pCur->messagePtr)), pCur->message_type, pCur->field_name, &pCur->field_info);
        }else{
            sqlite3_result_pointer(ctx, const_cast<void*>(pCur->messagePtr), pCur->message_type.c_str(), NULL);
            rc = SQLITE_OK;
        }
        break;
    }
    case _PB_FIELD_COLUMN_NAME :
        sqlite3_result_text(ctx, field_info.name.c_str(),field_info.name.length(),SQLITE_TRANSIENT);
        break;
    case _PB_FIELD_COLUMN_NUMBER :
        sqlite3_result_int(ctx, field_info.number);
        break;
    case _PB_FIELD_COLUMN_LABEL :
        sqlite3_result_text(ctx, field_info.label.c_str(),-1,SQLITE_TRANSIENT);
        break;
    case _PB_FIELD_COLUMN_TYPE :
        sqlite3_result_text(ctx, field_info.type.c_str(),-1,SQLITE_TRANSIENT);
        break;
    case _PB_FIELD_COLUMN_TYPE_NAME :
        sqlite3_result_text(ctx, field_info.type_name.c_str(),-1,SQLITE_TRANSIENT);
        break;
    default:
        sqlite3_result_int(ctx, pCur->iRowid);
        break;
    }
    return rc;
}
