cmake_minimum_required(VERSION 3.13)

project(sqlite3 LANGUAGES C)

set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)

file(READ "${CMAKE_CURRENT_SOURCE_DIR}/build_options.txt" OPTIONS_FILE_CONTENT)
string(REPLACE "\n" ";" OPTIONS_FILE_CONTENT_LIST "${OPTIONS_FILE_CONTENT}")
foreach(option_line IN LISTS OPTIONS_FILE_CONTENT_LIST)
    string(STRIP option_line stripped_option_line)
    add_compile_definitions("${stripped_option_line}")
endforeach()

if(DEFINED SQLITE_VERSION_NUMBER)
    message("SQLITE_VERSION_NUMBER=${SQLITE_VERSION_NUMBER}")
    set(SQLITE_ARCHIVE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/sqlite-src-${SQLITE_VERSION_NUMBER}")
    if(NOT EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/src/sqlite3.h)
        message(STATUS "SQLite source directory ${CMAKE_CURRENT_SOURCE_DIR}/src/ not found or empty.")
        if(NOT EXISTS "${SQLITE_ARCHIVE_DIR}/configure")
            # find VERSION_YEAR from the download link
            file(READ "version_numbers.json" VERSIONS_JSON)
            string(REGEX MATCH "\"${SQLITE_VERSION_NUMBER}\": \"([0-9]+)\"" _ ${VERSIONS_JSON})
            set(VERSION_YEAR ${CMAKE_MATCH_1})

            if(VERSION_YEAR)
                message("Version number and year found: ${SQLITE_VERSION_NUMBER}, ${VERSION_YEAR}")
            else()
                set(VERSION_YEAR "2024")
                message(WARNING "Does not find SQLITE_VERSION_NUMBER '${SQLITE_VERSION_NUMBER}' in version_numbers.json set VERSION_YEAR to ${VERSION_YEAR}")
            endif()
            set(SQLITE_DOWNLOAD_URL "https://www.sqlite.org/${VERSION_YEAR}/sqlite-src-${SQLITE_VERSION_NUMBER}.zip")
            set(SQLITE_ARCHIVE_FILE "${CMAKE_CURRENT_SOURCE_DIR}/sqlite-src-${SQLITE_VERSION_NUMBER}.zip")
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
            message(STATUS "${SQLITE_ARCHIVE_DIR} OK")
        endif()

        file(REMOVE_RECURSE ${CMAKE_CURRENT_SOURCE_DIR}/src)
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
        # message(FATAL_ERROR "-5a54sdfa645fdas765fds-")
        execute_process(
            COMMAND ${CMAKE_COMMAND} -E copy ${AMALGAMATION_DIR}/sqlite3.h ${CMAKE_CURRENT_SOURCE_DIR}/src/sqlite3.h
            COMMAND ${CMAKE_COMMAND} -E copy ${AMALGAMATION_DIR}/sqlite3.c ${CMAKE_CURRENT_SOURCE_DIR}/src/sqlite3.c
            COMMAND ${CMAKE_COMMAND} -E copy ${AMALGAMATION_DIR}/sqlite3ext.h ${CMAKE_CURRENT_SOURCE_DIR}/src/sqlite3ext.h
            COMMAND ${CMAKE_COMMAND} -E copy ${AMALGAMATION_DIR}/shell.c ${CMAKE_CURRENT_SOURCE_DIR}/src/shell.c
        )

        message("kgare5ex  copy src files amalgamation to ${CMAKE_CURRENT_SOURCE_DIR}/src/")
    endif()

    include_directories(${CMAKE_CURRENT_SOURCE_DIR}/src)
    add_library(sqlite3 STATIC ${CMAKE_CURRENT_SOURCE_DIR}/src/sqlite3.c)
    set_target_properties(sqlite3 PROPERTIES POSITION_INDEPENDENT_CODE ON)
    add_executable(sqlite3_executable ${CMAKE_CURRENT_SOURCE_DIR}/src/shell.c ${CMAKE_CURRENT_SOURCE_DIR}/src/sqlite3.c)
    include(FindThreads)
    target_link_libraries(sqlite3_executable -lm ${CMAKE_THREAD_LIBS_INIT} ${CMAKE_DL_LIBS})
    add_custom_command(TARGET sqlite3 POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:sqlite3> ${CMAKE_CURRENT_SOURCE_DIR}/out/libsqlite3.a
        DEPENDS sqlite3
    )
    add_custom_command(TARGET sqlite3_executable POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E rename $<TARGET_FILE:sqlite3_executable> ${CMAKE_CURRENT_BINARY_DIR}/sqlite3
        COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/sqlite3 ${CMAKE_CURRENT_SOURCE_DIR}/out/sqlite3
        DEPENDS sqlite3_executable
    )
else()
    message(FATAL_ERROR "SQLITE_VERSION_NUMBER variable is not defined. Set it to the desired value. Help: https://github.com/kzolti/sqlite3")
endif()
