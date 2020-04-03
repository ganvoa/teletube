var Tt = {
    VX: function(a, b) {
        a.splice(0, b);
    },
    pn: function(a) {
        a.reverse();
    },
    pQ: function(a, b) {
        var c = a[0];
        a[0] = a[b % a.length];
        a[b % a.length] = c;
    }
};
module.exports.dec = function(a) {
    a = a.split("");
    Tt.pn(a, 31);
    Tt.VX(a, 3);
    Tt.pn(a, 36);
    return a.join("");
};
