#ifndef PBEACH_H
#define PBEACH_H

#include <google/protobuf/message.h>
#include "common.h"
#ifdef SYSTEM_SQLITE
#include <sqlite3ext.h>
#endif
#ifdef CUSTOM_SQLITE
#include "../sqlite3/src/sqlite3ext.h"
#endif

#include <string>
#include <cstring>
SQLITE_EXTENSION_INIT3


class PbEach
{
public:
    PbEach();

    struct x_cursor {
        sqlite3_vtab_cursor base;  /* Base class - must be first */
        google::protobuf::Arena arena;
        const void *messagePtr;
        FieldInfo field_info;
        sqlite3_int64 iRowid;      /* The rowid */
        std::string message_type;  /*proto Path of the message */
        std::string field_name;  /* Path of the initial message */
        int message_id;  /* message id */
        int idxNum;
        const char *idxStr;
        int argc;
        sqlite3_value **argv;
    };
    static int xConnect(
        sqlite3 *db,
        void *pAux,
        [[maybe_unused]]int argc,
        const char *const*argv,
        sqlite3_vtab **ppVtab,
        char **pzErr
        );
    static int xDisconnect(sqlite3_vtab *pVtab){
        sqlite3_free(pVtab);
        return SQLITE_OK;
    }
    static int xOpen(sqlite3_vtab *p, sqlite3_vtab_cursor **ppCursor){
        x_cursor *pCur=new x_cursor();
        *ppCursor = &pCur->base;
        return SQLITE_OK;
    }

    static int xClose(sqlite3_vtab_cursor *cur){
        x_cursor *pCur = (x_cursor*)cur;
        delete pCur;
        pCur=0;
        return SQLITE_OK;
    }

    static int xNext(sqlite3_vtab_cursor *cur){
        x_cursor *pCur = (x_cursor*)cur;
        pCur->iRowid++;
        return SQLITE_OK;
    }

    static int xColumn(
        sqlite3_vtab_cursor *cur,   /* The cursor */
        sqlite3_context *ctx,       /* First argument to sqlite3_result_...() */
        int i                       /* Which column to return */
        );

    static int xRowid(sqlite3_vtab_cursor *cur, sqlite_int64 *pRowid){
        x_cursor *pCur = (x_cursor*)cur;
        *pRowid = pCur->iRowid;
        return SQLITE_OK;
    }

    static int xEof(sqlite3_vtab_cursor *cur){
        x_cursor *pCur = (x_cursor*)cur;
        if (!pCur->field_info.repeated_size) return SQLITE_DONE; //     repeated_size ==0 then EOF
        if (pCur->iRowid==0 || pCur->iRowid <  pCur->field_info.repeated_size) {
            return SQLITE_OK; // Még vannak további sorok az eredményhalmazban
        }
        else {
            return SQLITE_DONE; // Elértük az eredményhalmaz végét
        }
    }

    static int xBestIndex(
        sqlite3_vtab *tab,
        sqlite3_index_info *pIdxInfo
        );

    static int xFilter(
        sqlite3_vtab_cursor *pVtabCursor,
        [[maybe_unused]]int idxNum,
        [[maybe_unused]]const char *idxStr,
        [[maybe_unused]]int argc,
        sqlite3_value **argv
        );

    constexpr static const sqlite3_module module = {
        /* iVersion    */ 0,
        /* xCreate     */ 0,
        /* xConnect    */ PbEach::xConnect,
        /* xBestIndex  */ PbEach::xBestIndex,
        /* xDisconnect */ PbEach::xDisconnect,
        /* xDestroy    */ 0,
        /* xOpen       */ PbEach::xOpen,
        /* xClose      */ PbEach::xClose,
        /* xFilter     */ PbEach::xFilter,
        /* xNext       */ PbEach::xNext,
        /* xEof        */ PbEach::xEof,
        /* xColumn     */ PbEach::xColumn,
        /* xRowid      */ PbEach::xRowid,
        /* xUpdate     */ 0,
        /* xBegin      */ 0,
        /* xSync       */ 0,
        /* xCommit     */ 0,
        /* xRollback   */ 0,
        /* xFindMethod */ 0,
        /* xRename     */ 0,
        /* xSavepoint  */ 0,
        /* xRelease    */ 0,
        /* xRollbackTo */ 0,
        /* xShadowName */ 0
    };
};

#endif // PBEACH_H
