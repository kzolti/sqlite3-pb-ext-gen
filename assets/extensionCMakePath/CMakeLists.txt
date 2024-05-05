cmake_minimum_required(VERSION 3.13)
project(sqlite3_pb_ext)

set(CMAKE_C_STANDARD 17)
set(CMAKE_C_STANDARD_REQUIRED ON)


option(SYSTEM_SQLITE3 "Build the system sqlite3 library" ON)
option(CUSTOM_SQLITE3 "Build the custom sqlite3 library" OFF)

include(GenerateProject.cmake)

find_package(Protobuf REQUIRED)
if(Protobuf_FOUND)
    message(STATUS "Found Protobuf ${Protobuf_VERSION}\t ${Protobuf_LIBRARIES}")
    include_directories(${Protobuf_INCLUDE_DIRS})
else()
    message(FATAL_ERROR "Protobuf not found")
endif()


#    https://protobuf.dev/news/2022-08-03/#abseil-dep
#    Adding an Abseil Dependency
#    In order to reduce the Google vs. OSS differences between protobuf and to
#    simplify our own project, we plan to take a formal dependency on Abseil. 
#    In time, we plan to start using Abseil types in our public APIs, but
#    simply adding the dependency is a breaking change.
#    With v22.0, we’ve taken on an explicit dependency on Abseil. This allowed
#    us to remove most of our stubs, which were branched from old internal code that later became Abseil.
find_package(absl REQUIRED)
if(absl_FOUND)
    message(STATUS "Found absl version:${absl_VERSION} in ${absl_CONFIG} ${absl_INCLUDE_DIRS} ${absl_LIBRARIES}")
    #    absl::* 
    set(protobuf_ABSL_USED_TARGETS
        absl::absl_check
        absl::absl_log
        absl::algorithm
        absl::base
        absl::bind_front
        absl::bits
        absl::btree
        absl::cleanup
        absl::cord
        absl::core_headers
        absl::debugging
        absl::die_if_null
        absl::dynamic_annotations
        absl::flags
        absl::flat_hash_map
        absl::flat_hash_set
        absl::function_ref
        absl::hash
        absl::layout
        absl::log_initialize
        absl::log_severity
        absl::memory
        absl::node_hash_map
        absl::node_hash_set
        absl::optional
        absl::span
        absl::status
        absl::statusor
        absl::strings
        absl::synchronization
        absl::time
        absl::type_traits
        absl::utility
        absl::variant
    )
else()
    message(FATAL_ERROR "absl not found")
endif()

if(SYSTEM_SQLITE3)
    find_package(SQLite3 REQUIRED)
    if(SQLite3_FOUND)
        message(STATUS "Found SQLite3  ${SQLite3_VERSION}\t ${SQLite3_LIBRARIES}")
        include_directories(${SQLite3_INCLUDE_DIRS})
    else()
        message(FATAL_ERROR "SQLite3 not found")
    endif()
    add_library(sqlite3_pb_ext SHARED
        src/common.h
        src/pb_field.h src/pb_field.cpp
        src/pb_each.h src/pb_each.cpp
        src/main_module.cpp
        ${GENERATED_FILES}
    )
    target_compile_definitions(sqlite3_pb_ext PRIVATE SYSTEM_SQLITE)
    set_target_properties(sqlite3_pb_ext PROPERTIES
        LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/lib/system_sqlite3"
        LIBRARY_OUTPUT_NAME "sqlite3_pb_ext"
    )
    add_dependencies(sqlite3_pb_ext generate_sqlite3_pb_ext_sources)
    target_link_libraries(sqlite3_pb_ext PUBLIC ${Protobuf_LIBRARIES} ${SQLite3_LIBRARIES} ${protobuf_ABSL_USED_TARGETS})
endif()
message("hjhuweuzert ${CUSTOM_SQLITE3}")
if(CUSTOM_SQLITE3)
    message(STATUS "build custom sqlite3 in ${CMAKE_CURRENT_BINARY_DIR}/lib/custom_sqlite3")
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/sqlite3 sqlite3)
    add_library(custom_sqlite3_pb_ext SHARED
        src/common.h
        src/pb_field.h src/pb_field.cpp
        src/pb_each.h src/pb_each.cpp
        src/main_module.cpp
        ${GENERATED_FILES}
    )
    target_compile_definitions(custom_sqlite3_pb_ext PRIVATE CUSTOM_SQLITE)
    if(DEFINED SQLITE_VERSION)
        add_dependencies(custom_sqlite3_pb_ext sqlite3)
    endif()
    add_library(sqlite3lib STATIC IMPORTED)
    set_target_properties(sqlite3lib PROPERTIES
        IMPORTED_LOCATION ${CMAKE_CURRENT_SOURCE_DIR}/sqlite3/target/libsqlite3.a
        INTERFACE_INCLUDE_DIRECTORIES ${CMAKE_CURRENT_SOURCE_DIR}/sqlite3/include
    )
    set_target_properties(custom_sqlite3_pb_ext PROPERTIES
        LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/lib/custom_sqlite3"
        LIBRARY_OUTPUT_NAME "sqlite3_pb_ext"
    )
    add_dependencies(custom_sqlite3_pb_ext generate_sqlite3_pb_ext_sources)
    target_link_libraries(custom_sqlite3_pb_ext PUBLIC protobuf::libprotobuf sqlite3lib ${protobuf_ABSL_USED_TARGETS})
endif()
