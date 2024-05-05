cmake_minimum_required(VERSION 3.13)

project(sqlite3 LANGUAGES C)

set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)

if(DEFINED SQLITE_VERSION)
    #region Format  ENCODED_VERSION_NAME from SQLITE_VERSION
    #  https://www.sqlite.org/download.html
    #  The version is encoded so that filenames sort in order of increasing version
    #  number when viewed using "ls". For version 3.X.Y the filename encoding is
    #  3XXYY00. For branch version 3.X.Y.Z, the encoding is 3XXYYZZ.
    set(MAJOR 0)
    set(X 0)
    set(Y 0)
    set(Z 0)
    # split SQLITE_VERSION
    string(REPLACE "." ";" VERSION_LIST ${SQLITE_VERSION})
    # set list_length to the length of VERSION_LIST
    list(LENGTH VERSION_LIST list_length)
    list(GET VERSION_LIST 0 MAJOR)
    list(GET VERSION_LIST 1 X)
    if(list_length GREATER_EQUAL 3)
        list(GET VERSION_LIST 2 Y)
    endif()
    if(list_length GREATER_EQUAL 4)
        list(GET VERSION_LIST 3 Z)
    endif()
    if(${X} LESS 10)
        set(X "0${X}")
    endif()
    if(${Y} LESS 10)
        set(Y "0${Y}")
    endif()
    if(${Z} LESS 10)
        set(Z "0${Z}")
    endif()

    set(ENCODED_VERSION_NAME "${MAJOR}${X}${Y}${Z}")
    # message("ENCODED_VERSION_NAME: ${ENCODED_VERSION_NAME}")
    #endregion Format  ENCODED_VERSION_NAME from SQLITE_VERSION
    #region Check include/sqlite3.h
    file(READ "${CMAKE_CURRENT_SOURCE_DIR}/build_options.txt" OPTIONS_FILE_CONTENT)
    string(REPLACE "\n" ";" OPTIONS_FILE_CONTENT_LIST "${OPTIONS_FILE_CONTENT}")
    foreach(option_line IN LISTS OPTIONS_FILE_CONTENT_LIST)
        string(STRIP option_line stripped_option_line)
        add_compile_definitions("${stripped_option_line}")
    endforeach()
    set(SQLITE_ARCHIVE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/sqlite-src-${ENCODED_VERSION_NAME}")
    set (INCLUDE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/include") 
    set (TARGET_DIR "${CMAKE_CURRENT_SOURCE_DIR}/target")
    if(EXISTS ${INCLUDE_DIR}/sqlite3.h)
        message(STATUS "Check sqlite3.h")
        file(READ ${INCLUDE_DIR}/sqlite3.h SQLITE_HEADER_CONTENT)
        set(OK FALSE)
        string(REGEX MATCH "#define SQLITE_VERSION +\"([0-9]+\\.[0-9]+\\.[0-9]+)\"" SQLITE_VERSION_LINE "${SQLITE_HEADER_CONTENT}")
        if(SQLITE_VERSION_LINE)
            if(SQLITE_VERSION STREQUAL CMAKE_MATCH_1)
                message(STATUS "${INCLUDE_DIR}/sqlite3.h is up to date, version: ${CMAKE_MATCH_1}")
                set(OK TRUE)
            else()
                message(STATUS "${INCLUDE_DIR}/sqlite3.h is outdated, version: ${CMAKE_MATCH_1}")
            endif()
        else()
            message(FATAL_ERROR "Not find SQLITE_VERSION in ${INCLUDE_DIR}/sqlite3.h")
        endif()
        if(NOT OK)
            message(STATUS "Deleting ${INCLUDE_DIR} and ${TARGET_DIR} directoryes")
            file(REMOVE_RECURSE ${INCLUDE_DIR})
            file(REMOVE_RECURSE "${TARGET_DIR}")
        endif()
    endif()
    #endregion Check include/sqlite3.h
    if(NOT EXISTS ${INCLUDE_DIR}/sqlite3.h)
        #region Download, extract, make sqlite3 from source code
        message(STATUS "SQLite source directory ${INCLUDE_DIR} not found or empty.")
        if(NOT EXISTS "${SQLITE_ARCHIVE_DIR}/configure")
            # find VERSION_YEAR from the download link
            file(READ "${CMAKE_CURRENT_SOURCE_DIR}/versions.json" VERSIONS_JSON)
            string(REGEX MATCH "${SQLITE_VERSION}\": \"([0-9]+)\"" VERSION_LINE "${VERSIONS_JSON}")
            if(VERSION_LINE)
                set(VERSION_YEAR ${CMAKE_MATCH_1})
                message("Version and year found in version_numbers.json: ${SQLITE_VERSION}, ${VERSION_YEAR}")
            else()
                set(VERSION_YEAR "2024")
                message(WARNING "Does not find SQLITE_VERSION '${SQLITE_VERSION}' in version_numbers.json set VERSION_YEAR to ${VERSION_YEAR}")
            endif()
            set(SQLITE_DOWNLOAD_URL "https://www.sqlite.org/${VERSION_YEAR}/sqlite-src-${ENCODED_VERSION_NAME}.zip")
            set(SQLITE_ARCHIVE_FILE "${CMAKE_CURRENT_SOURCE_DIR}/sqlite-src-${ENCODED_VERSION_NAME}.zip")
            message(STATUS "Downloading ${SQLITE_DOWNLOAD_URL} ...")
            file(DOWNLOAD "${SQLITE_DOWNLOAD_URL}" "${SQLITE_ARCHIVE_FILE}" STATUS status)
            list(GET status 0 status_code)
            if(NOT status_code EQUAL 0)
                message(FATAL_ERROR "HTTP error ${status} - 90ea4h")
            endif()
            # Extracts the downloaded file
            execute_process(
                COMMAND ${CMAKE_COMMAND} -E tar -xf "${SQLITE_ARCHIVE_FILE}"
                WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
            )
            file(REMOVE "${SQLITE_ARCHIVE_FILE}")
        else()
            message(STATUS "${SQLITE_ARCHIVE_DIR} is exits skipping download")
        endif()
        file(REMOVE_RECURSE ${INCLUDE_DIR})
        set(AMALGAMATION_DIR "${SQLITE_ARCHIVE_DIR}/amalgamation")
        file(REMOVE_RECURSE ${AMALGAMATION_DIR})
        file(MAKE_DIRECTORY ${AMALGAMATION_DIR})
        string(REPLACE "\n" " " OPTIONS_FILE_CONTENT ${OPTIONS_FILE_CONTENT})
        message("    Create sqlite3 amalgamation in ${AMALGAMATION_DIR} ")
        message("    ../configure CFLAGS=${OPTIONS_FILE_CONTENT}")

        # Preparing for the Amalgamation
        execute_process(
            COMMAND ../configure CFLAGS=${OPTIONS_FILE_CONTENT}
            WORKING_DIRECTORY ${AMALGAMATION_DIR}
        )
        message("hdae42f configured")

        # Generating SQlite3 Amalgamation files sqlite3.h sqlite3ext.h sqlite3.c
        execute_process(
            COMMAND make sqlite3.c
            WORKING_DIRECTORY ${AMALGAMATION_DIR}
        )
        execute_process(
            COMMAND ${CMAKE_COMMAND} -E copy ${AMALGAMATION_DIR}/sqlite3.h ${INCLUDE_DIR}/sqlite3.h
            COMMAND ${CMAKE_COMMAND} -E copy ${AMALGAMATION_DIR}/sqlite3.c ${INCLUDE_DIR}/sqlite3.c
            COMMAND ${CMAKE_COMMAND} -E copy ${AMALGAMATION_DIR}/sqlite3ext.h ${INCLUDE_DIR}/sqlite3ext.h
            COMMAND ${CMAKE_COMMAND} -E copy ${AMALGAMATION_DIR}/shell.c ${INCLUDE_DIR}/shell.c
        )

        message("kgare5ex  copy src files amalgamation to ${INCLUDE_DIR}")
    endif()
    #endregion Download, extract, make sqlite3 from source code
    include_directories(${INCLUDE_DIR})
    add_library(sqlite3 STATIC ${INCLUDE_DIR}/sqlite3.c)
    set_target_properties(sqlite3 PROPERTIES POSITION_INDEPENDENT_CODE ON)
    add_executable(sqlite3_executable ${INCLUDE_DIR}/shell.c ${INCLUDE_DIR}/sqlite3.c)
    include(FindThreads)
    target_link_libraries(sqlite3_executable -lm ${CMAKE_THREAD_LIBS_INIT} ${CMAKE_DL_LIBS})
    add_custom_command(TARGET sqlite3 POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:sqlite3> ${TARGET_DIR}/libsqlite3.a
        DEPENDS sqlite3
    )
    add_custom_command(TARGET sqlite3_executable POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E rename $<TARGET_FILE:sqlite3_executable> ${CMAKE_CURRENT_BINARY_DIR}/sqlite3
        COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/sqlite3 ${TARGET_DIR}/sqlite3
        DEPENDS sqlite3_executable
    )
else()
    message(FATAL_ERROR "SQLITE_VERSION variable is not defined. Set it to the desired value. Help: https://github.com/kzolti/sqlite3")
endif()
