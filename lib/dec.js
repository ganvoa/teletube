var Tt={NV:function(a,b){a.splice(0,b)},
JJ:function(a,b){var c=a[0];a[0]=a[b%a.length];a[b%a.length]=c},
WZ:function(a){a.reverse()}};
module.exports.dec=function(a){a=a.split("");Tt.WZ(a,70);Tt.JJ(a,67);Tt.JJ(a,37);Tt.NV(a,2);Tt.JJ(a,59);return a.join("")}