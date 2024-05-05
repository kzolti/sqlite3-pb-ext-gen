# sqlite3-pb-ext-gen 
**SQLite3 Protobuf extension generator**

The Node.js program generates the source code in C/C++ from the *.proto files to be used in the database. After the build, an extension that can be loaded into the database manager is created. Then, the protobuf data stored in binary can be read using the **pb_extract** function and the **pb_field** and **pb_each** virtual tables. It is designed to be efficient and fast, as it avoids using the descriptor and reflection APIs . This extension builds directly on the C++ code generated with 'protoc'.

### Table of Contents

1. [Installation](#1-installation)
2. [Extension source code generation](#2-extension-source-code-generation)
3. [Making an extension](#3-making-an-extension)
3. [SQL Function and Virtual Tables](#3-sql-function-and-virtual-tables)
4. [SQL example](#4-sql-example)
5. [Performance](#5-performance)
7. [Conclusion](#7-conclusion)

### 1. Installation
``` 
npm i -g sqlite3-pb-ext-gen
```
dependency: protobuf-compiler

##### Check dependency:
``` protoc --version```
##### Check sqlite3-pb-ext-gen:
``` sqlite3-pb-ext-gen --version```
##### Update for sqlite3-pb-ext-gen:
``` npm update -g sqlite3-pb-ext-gen```
##### View sqlite3-pb-ext-gen:
``` npm view sqlite3-pb-ext-gen```
### 2. Extension source code generation

example command: 
```
sqlite3-pb-ext-gen --proto_path=/tmp/proto --out_path=/tmp/out addressbook.proto
```
usable arguments:
```
Usage: sqlite3-pb-ext-gen [OPTION] PROTO_FILES
dependencies: protoc
Parse PROTO_FILES and generate output based on the options given:
  -v, --version               Show sqlite3-pb-ext-gen version and exit.
  -h, --help                  Show this text and exit.
  -oPATH, --out_path=PATH     Generated SQLite3 Protobuf extension path.
  -IPATH, --proto_path=PATH   Specify the directory in which to search for
                              imports.  May be specified multiple times;
                              directories will be searched in order.  If not
                              given, the current working directory is used.
                              If not found in any of the these directories,
                              the --descriptor_set_in descriptors will be
                              checked for required proto file.
  @<filename>                 Read options and filenames from file. If a
                              relative file path is specified, the file will
                              be searched in the working directory.
                              The --proto_path option will not affect how this
                              argument file is searched. Content of the file
                              will be expanded in the position of @<filename>
                              as in the argument list. Note that shell 
                              expansion is not applied to the content of the 
                              file (i.e., you cannot use quotes, wildcards,
                              escapes, commands, etc.). Each line corresponds
                              to a single argument, even if it contains spaces. 

```

###  3. Making an extension 
####  System SQLite3 
This command creates an extension for the sqlite3 version installed on the system
```
mkdir build && cd build  && \
cmake .. && cmake --build . 
```
#### Official SQLite3 versions
By using the CUSTOM_SQLITE3=ON switch, it is possible to create a plugin for other versions of sqlite3.  If you want to use the official sqlite version, use the variable SQLITE_VERSION.
It is important to check that the SQLite Compile-time Options are correct for your project. You can change the compile time options in <--out_path>/sqlite3/build_options.txt. 

```
mkdir build && cd build  && \
cmake -DCUSTOM_SQLITE3=ON -DSQLITE_VERSION=3.44.0 .. && cmake --build .
```
#### SQLite3 based database
For other SQLite3-based databases, you'll need to manually place the files required to create the extension in the <out_path>/sqlite3 directory.
  - <out_path>/sqlite3/include/ - sqlite3ext.h, sqlite3.h
  - <out_path>/sqlite3/target/ - libsqlite3.a
```
mkdir build && cd build  && \
cmake -DCUSTOM_SQLITE3=ON .. && cmake --build .
```
### 3. SQL Function and Virtual Tables

The extension introduces `pb_extract` function and two virtual tables: `pb_field` and `pb_each`.

#### 3.1.  pb_extract
 The `pb_extarct` function extracts a specific value from a protobuf message based on a given path. It does not return a pointer of the Message type, for this use the `pb_each` or `pb_field` virtual table module. 
 
 ##### Parameters of the pb_extract:
  - `message`: A `sqlite3_value_blob` or `sqlite3_value_pointer` representing the protobuf message.
  - `message_type`: The fully qualified name of the protobuf message type name.
  - `path`: The path to the desired value within the protobuf message.

Values returned with the pb_extract function:
| protobuf type | sqlite3_value |
|:----------------:|:---------------:|
| `Message`       | `sqlite3_value_error`    |
| `bool, enum, fixed32, int32, sfixed32, sint32, uint32` | `sqlite3_value_int` |
| `fixed64, int64, sfixed64, sint64, uint64` | `sqlite3_value_int64` |
| `double, float` | `sqlite3_value_double` |
| `string` | `sqlite3_value_text` |
| `bytes` | `sqlite3_value_blob` |
| `oneof, map` | not supported |

 #### 3.2. pb_field
 The `pb_filed` virtual table returns the details of a single field within a protobuf message. 

 #### 3.3. pb_each
 The `pb_each` virtual table returns information about repeated fields in a protobuf message.
 
##### Parameters of virtual tables
- `message`: Either `sqlite3_value_blob` or `sqlite3_value_pointer` representing the protobuf message.
- `message_type`: String specifying the protobuf message type.
- `field`: String containing the field name. If empty string, the initialized message is returned.

##### Fields of virtual tables
pb_each virtual table provides information about repeated fields in a protobuf message. The columns provide the following details:

 - `value`: The value of the field. Its types can be: 

| protobuf type | sqlite3_value |
|:----------------:|:---------------:|
| `Message` | `sqlite3_value_pointer` |
| `bool, enum, fixed32, int32, sfixed32, sint32, uint32` | `sqlite3_value_int` |
| `fixed64, int64, sfixed64, sint64, uint64` | `sqlite3_value_int64` |
| `double, float` | `sqlite3_value_double` |
| `string` | `sqlite3_value_text` |
| `bytes` | `sqlite3_value_blob` |
| `oneof, map` | not supported |
 - `repeated_id`: This column represents the index of the repeating field.(pb_each only)

 - `name`: This column displays the name of the field.
 - `number`: The field number as specified in the protobuf definition file.
 - `label`: The field label (optional or repeated). Note that maps are not supported.
 - `type`: This column indicates the type of the field, as defined in the protobuf definition (message, enum, or scalar type).
 - `type_name`: In the case of enum or message types, this column contains the type name.

These columns provide a comprehensive overview of the fields

### 4. SQL example

Suppose you have a table named `person` with the following structure:

```sql
CREATE TABLE person (id INTEGER PRIMARY KEY, proto BLOB); /* proto type: [tutorial.Person] https://github.com/protocolbuffers/protobuf/blob/main/examples/addressbook.proto */
```

You can use the extension to retrieve phone numbers of a person with the name "John Doe 2005" and the phone type "HOME" using the following query:

```sql
SELECT
  pb_extract(phone.value, phone.type_name, 'number') phone_number
FROM person AS person_t
, pb_field(proto, 'tutorial.Person','') person
, pb_each(person.value, person.type_name, 'phones') phone
, pb_field(phone.value, phone.type_name, 'type') phone_type
WHERE
  pb_extract(proto,'tutorial.Person','name')='John Doe 2005'
  AND phone_type.type_name='tutorial.Person.PhoneType.HOME';
```
You can find the [complete cpp example](https://github.com/kzolti/sqlite3-pb-ext-example) in the examples directory.
```
git submodule update --init \
&& cd example
```

### 5. Performance

The extension's reliance on the protobuf compiler's generated C++ code ensures superior performance compared to using descriptor and reflection APIs.

### 7. Conclusion

The extension created with sqlite3-pb-ext-gen allows you to work with Protocol Buffers data within SQLite databases, providing a seamless and efficient solution for querying binary data. Make sure to follow the recommended practices for Protobuf (https://protobuf.dev/programming-guides/dos-donts/).

