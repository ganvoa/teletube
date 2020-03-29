var Ts={kN:function(a,b){a.splice(0,b)},
MF:function(a,b){var c=a[0];a[0]=a[b%a.length];a[b%a.length]=c},
YA:function(a){a.reverse()}};
module.exports.dec=function(a){a=a.split("");Ts.MF(a,52);Ts.kN(a,2);Ts.MF(a,17);Ts.kN(a,2);return a.join("")}