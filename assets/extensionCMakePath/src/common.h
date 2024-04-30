#ifndef COMMON_H
#define COMMON_H
#include <string>
struct FieldInfo {
    std::string name;
    int number;
    std::string label;
    std::string type;
    std::string type_name;
    bool repeated=false;
    int repeated_size=0;  // repeated field only
    std::string err;
//    std::string fullkey="";
//    std::string path="";
//    std::string message_type;

};
#endif // COMMON_H
