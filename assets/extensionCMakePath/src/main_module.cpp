#include <cstring>
#include <string>
#if !defined(SQLITEINT_H)
#ifdef SYSTEM_SQLITE
#include <sqlite3.h>
#include <sqlite3ext.h>
#endif
#ifdef CUSTOM_SQLITE
#include "../sqlite3/include/sqlite3.h"
#include "../sqlite3/include/sqlite3ext.h"
#endif

// // check Pointer Passing Interfaces 
// #if SQLITE_VERSION_NUMBER < 3020000
// #error "This project requires SQLite version 3.20.0 or later! https://sqlite.org/bindptr.html"
// #endif

#endif
SQLITE_EXTENSION_INIT1
#include <assert.h>
#include "../src/gen/pbExtract.h"
#include "../src/pb_field.h"
#include "../src/pb_each.h"


    static void pb_extract(
        sqlite3_context *ctx,
        int argc,
        sqlite3_value **argv
        ) {
    if (argc < 3 /*|| sqlite3_value_type(argv[0]) != SQLITE_BLOB || sqlite3_value_type(argv[1]) != SQLITE_TEXT*/) {
        sqlite3_result_error(ctx, "Invalid argument in pb_extract: message_data, message_name, field_path is requied", -1);
        return;
    }
    int value_type = sqlite3_value_type(argv[0]);
    const std::string message_type_name=std::string(reinterpret_cast<const char*>(sqlite3_value_text(argv[1])),
                                                      static_cast<size_t>(sqlite3_value_bytes(argv[1])));
    const std::string field_path=std::string(reinterpret_cast<const char*>(sqlite3_value_text(argv[2])),
                                               static_cast<size_t>(sqlite3_value_bytes(argv[2])));
    if (value_type==SQLITE_NULL){
        const void *message=sqlite3_value_pointer(argv[0], message_type_name.c_str());
        if(message != nullptr){
            PbExtract::extract(ctx, static_cast<google::protobuf::Message*>(const_cast<void*>(message)), message_type_name,field_path);
        }else{
            sqlite3_result_error(ctx,sqlite3_mprintf("jde4ed5 pointer_init_error, not valid message_type:'%s'"
                                                      ,message_type_name.c_str()),-1);
        }
    }else{
        const std::string message_blob_data=std::string(reinterpret_cast<const char*>(sqlite3_value_blob(argv[0])),
                                                          static_cast<size_t>(sqlite3_value_bytes(argv[0])));
        PbExtract::extract(ctx, message_blob_data, message_type_name,field_path);
    }
}


#ifdef _WIN32
__declspec(dllexport)
#endif
    extern "C"
    int sqlite3_sqlitepbext_init(
        sqlite3 *db,
        char **pzErrMsg,
        const sqlite3_api_routines *pApi
        ){
    int rc = SQLITE_OK;
    SQLITE_EXTENSION_INIT2(pApi);
    if(sqlite3_libversion_number() != SQLITE_VERSION_NUMBER){
        *pzErrMsg=sqlite3_mprintf("\nThe sqlite3 version does not match sqlite3_pb_ext build sqlite3 version ! \n"
                                    "sqlite3 runtime versio:\t\t%s \n"
                                    "sqlite3_pb_ext build sqlite3 versio:\t%s"
                                    ,sqlite3_libversion(), SQLITE_VERSION);
        rc=SQLITE_ERROR;
    }else{
        rc = sqlite3_create_module(db, "pb_field", & PbField::module, 0);
        if(rc==SQLITE_OK){
            rc = sqlite3_create_module(db, "pb_each", & PbEach::module, 0);
        }
        //        register_pb_extract(db, pzErrMsg, pApi);
        if (rc == SQLITE_OK){
            rc = sqlite3_create_function(db, "pb_extract", 3,
                                         SQLITE_UTF8 | SQLITE_DETERMINISTIC , 0, pb_extract, 0, 0);
        }else{
            std::cerr<<"8e5a44d fail"<<std::endl;
        }
    }
    return rc;
}
//}
