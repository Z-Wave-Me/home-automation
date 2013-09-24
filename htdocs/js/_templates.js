(function() {
var templates = {};
templates["modules/BatteryPolling/batteryStatusWidget.html"] = (function() {
function root(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
return output;
} catch (e) {
  runtime.handleError(e, lineno, colno);
}
}
return {
root: root
};

})();
templates["widgets/fan.html"] = (function() {
function root(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
var parentTemplate = env.getTemplate("widgets/smallWidget.html", true);
for(var t_1 in parentTemplate.blocks) {
context.addBlock(t_1, parentTemplate.blocks[t_1]);
}
output += "\n\n";
output += "\n";
return parentTemplate.rootRenderFunc(env, context, frame, runtime);
} catch (e) {
  runtime.handleError(e, lineno, colno);
}
}
function b_content(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
var l_super = runtime.markSafe(context.getSuper(env, "content", b_content, frame, runtime));
output += "\n    ";
if(runtime.contextOrFrameLookup(context, frame, "state")) {
output += "\n        <h1>Fan: On</h1>\n    ";
}
else {
output += "\n        <h1>Fan: Off</h1>\n    ";
}
output += "\n\n    <div class=\"row\">\n\t    ";
if(runtime.contextOrFrameLookup(context, frame, "state")) {
output += "\n\t        <div class=\"span1\"><a href=\"#\" data-vdev=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "\" data-command=\"off\" class=\"widgetCommandButton btn btn-danger\">Switch&nbsp;off</a></div>\n\t    ";
}
else {
output += "\n\t        <div class=\"span1\"><a href=\"#\" data-vdev=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "\" data-command=\"on\" class=\"widgetCommandButton btn btn-success\">Switch&nbsp;on</a></div>\n\t    ";
}
output += "\n\n\t    <div class=\"span1\"><select data-vdev=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "\" data-command=\"setMode\" class=\"widgetModeSelector\">\n\t\t    ";
frame = frame.push();
var t_3 = runtime.contextOrFrameLookup(context, frame, "modes");
if(t_3) {for(var t_2=0; t_2 < t_3.length; t_2++) {
var t_4 = t_3[t_2];
frame.set("mode", t_4);
output += "\n\t\t    \t<option value=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id", env.autoesc), env.autoesc);
output += "\"\n\t\t    \t\t";
if(runtime.contextOrFrameLookup(context, frame, "currentMode") == runtime.memberLookup((t_4),"id", env.autoesc)) {
output += "selected=\"yes\"";
}
output += "\n\t\t    \t>";
output += runtime.suppressValue(runtime.memberLookup((t_4),"title", env.autoesc), env.autoesc);
output += "</option>\n\t\t    ";
}
}frame = frame.pop();
output += "\n\t    </select></div>\n\t</div>\n";
return output;
} catch (e) {
  runtime.handleError(e, lineno, colno);
}
}
return {
b_content: b_content,
root: root
};

})();
templates["widgets/multilevel.html"] = (function() {
function root(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
var parentTemplate = env.getTemplate("widgets/smallWidget.html", true);
for(var t_1 in parentTemplate.blocks) {
context.addBlock(t_1, parentTemplate.blocks[t_1]);
}
output += "\n\n";
output += "\n";
return parentTemplate.rootRenderFunc(env, context, frame, runtime);
} catch (e) {
  runtime.handleError(e, lineno, colno);
}
}
function b_content(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
var l_super = runtime.markSafe(context.getSuper(env, "content", b_content, frame, runtime));
output += "\n    ";
if(99 == runtime.contextOrFrameLookup(context, frame, "metricValue")) {
output += "\n        <h1>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "widgetTitle"), env.autoesc);
output += ": Full</h1>\n    ";
}
else {
if(0 == runtime.contextOrFrameLookup(context, frame, "metricValue")) {
output += "\n        <h1>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "widgetTitle"), env.autoesc);
output += ": Off</h1>\n    ";
}
else {
output += "\n        <h1>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "widgetTitle"), env.autoesc);
output += ": ";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "metricValue"), env.autoesc);
output += " %</h1>\n    ";
}
}
output += "\n\n    <div class=\"\">\n        <a href=\"#\" data-vdev=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "\" data-command=\"off\"      class=\"widgetCommandButton btn ";
if(0 == runtime.contextOrFrameLookup(context, frame, "metricValue")) {
output += "disabled";
}
output += "\">Off</a>\n        <a href=\"#\" data-vdev=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "\" data-command=\"min\"      class=\"widgetCommandButton btn\">Min</a>\n        <a href=\"#\" data-vdev=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "\" data-command=\"decrease\" class=\"widgetCommandButton btn\">-</a>\n        <a href=\"#\" data-vdev=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "\" data-command=\"increase\" class=\"widgetCommandButton btn\">+</a>\n        <a href=\"#\" data-vdev=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "\" data-command=\"max\"      class=\"widgetCommandButton btn\">Max</a>\n        <a href=\"#\" data-vdev=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "\" data-command=\"on\"       class=\"widgetCommandButton btn ";
if(0 < runtime.contextOrFrameLookup(context, frame, "metricValue")) {
output += "disabled";
}
output += "\">On</a>\n    </div>\n";
return output;
} catch (e) {
  runtime.handleError(e, lineno, colno);
}
}
return {
b_content: b_content,
root: root
};

})();
templates["widgets/probe.html"] = (function() {
function root(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
var parentTemplate = env.getTemplate("widgets/smallWidget.html", true);
for(var t_1 in parentTemplate.blocks) {
context.addBlock(t_1, parentTemplate.blocks[t_1]);
}
output += "\n\n";
output += "\n";
return parentTemplate.rootRenderFunc(env, context, frame, runtime);
} catch (e) {
  runtime.handleError(e, lineno, colno);
}
}
function b_content(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
var l_super = runtime.markSafe(context.getSuper(env, "content", b_content, frame, runtime));
output += "\n    <h1>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "widgetTitle"), env.autoesc);
output += ": ";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "metricValue"), env.autoesc);
output += " ";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "scaleTitle"), env.autoesc);
output += "</h1>\n";
return output;
} catch (e) {
  runtime.handleError(e, lineno, colno);
}
}
return {
b_content: b_content,
root: root
};

})();
templates["widgets/sensor.html"] = (function() {
function root(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
var parentTemplate = env.getTemplate("widgets/smallWidget.html", true);
for(var t_1 in parentTemplate.blocks) {
context.addBlock(t_1, parentTemplate.blocks[t_1]);
}
output += "\n\n";
output += "\n";
return parentTemplate.rootRenderFunc(env, context, frame, runtime);
} catch (e) {
  runtime.handleError(e, lineno, colno);
}
}
function b_content(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
var l_super = runtime.markSafe(context.getSuper(env, "content", b_content, frame, runtime));
output += "\n    <h1>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "widgetTitle"), env.autoesc);
output += ": ";
if(runtime.contextOrFrameLookup(context, frame, "metricValue")) {
output += "Active";
}
else {
output += "Inactive";
}
output += "</h1>\n";
return output;
} catch (e) {
  runtime.handleError(e, lineno, colno);
}
}
return {
b_content: b_content,
root: root
};

})();
templates["widgets/smallWidget.html"] = (function() {
function root(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
output += "<div class=\"span4 smallWidget\">\n    <div class=\"well\" style=\"height: 100%\">\n        <div class=\"pull-right\"><a href=\"#\" class=\"widgetCommandButton btn btn-mini refreshButton\" data-vdev=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "\" data-command=\"update\"><i class=\"icon-refresh\"></i></a></div>\n\t    <div class=\"vDevId\">vDev ID: <b>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "</b></div>\n        ";
output += context.getBlock("content")(env, context, frame, runtime);
output += "\n    </div>\n</div>\n";
return output;
} catch (e) {
  runtime.handleError(e, lineno, colno);
}
}
function b_content(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
var l_super = runtime.markSafe(context.getSuper(env, "content", b_content, frame, runtime));
return output;
} catch (e) {
  runtime.handleError(e, lineno, colno);
}
}
return {
b_content: b_content,
root: root
};

})();
templates["widgets/switch.html"] = (function() {
function root(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
var parentTemplate = env.getTemplate("widgets/smallWidget.html", true);
for(var t_1 in parentTemplate.blocks) {
context.addBlock(t_1, parentTemplate.blocks[t_1]);
}
output += "\n\n";
output += "\n";
return parentTemplate.rootRenderFunc(env, context, frame, runtime);
} catch (e) {
  runtime.handleError(e, lineno, colno);
}
}
function b_content(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
var l_super = runtime.markSafe(context.getSuper(env, "content", b_content, frame, runtime));
output += "\n    ";
if(255 == runtime.contextOrFrameLookup(context, frame, "metricValue")) {
output += "\n        <h1>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "widgetTitle"), env.autoesc);
output += ": On</h1>\n        <div class=\"\"><a href=\"#\" data-vdev=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "\" data-command=\"off\" class=\"widgetCommandButton btn btn-danger\">Switch off</a></div>\n    ";
}
else {
output += "\n        <h1>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "widgetTitle"), env.autoesc);
output += ": Off</h1>\n        <div class=\"\"><a href=\"#\" data-vdev=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "\" data-command=\"on\" class=\"widgetCommandButton btn btn-success\">Switch on</a></div>\n    ";
}
output += "\n";
return output;
} catch (e) {
  runtime.handleError(e, lineno, colno);
}
}
return {
b_content: b_content,
root: root
};

})();
templates["widgets/thermostat.html"] = (function() {
function root(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
var parentTemplate = env.getTemplate("widgets/smallWidget.html", true);
for(var t_1 in parentTemplate.blocks) {
context.addBlock(t_1, parentTemplate.blocks[t_1]);
}
output += "\n\n";
output += "\n";
return parentTemplate.rootRenderFunc(env, context, frame, runtime);
} catch (e) {
  runtime.handleError(e, lineno, colno);
}
}
function b_content(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
var l_super = runtime.markSafe(context.getSuper(env, "content", b_content, frame, runtime));
output += "\n    ";
if(runtime.contextOrFrameLookup(context, frame, "hasSensor")) {
output += "\n        <h1>Thermostat: ";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "level"), env.autoesc);
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "scaleTitle"), env.autoesc);
output += "</h1>\n    ";
}
else {
output += "\n        <h1>Thermostat</h1>\n    ";
}
output += "\n\n    <div><select data-vdev=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "\" data-command=\"setMode\" class=\"widgetModeSelector\">\n\t    ";
frame = frame.push();
var t_3 = runtime.contextOrFrameLookup(context, frame, "modes");
if(t_3) {for(var t_2=0; t_2 < t_3.length; t_2++) {
var t_4 = t_3[t_2];
frame.set("mode", t_4);
output += "\n\t    \t<option value=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id", env.autoesc), env.autoesc);
output += "\"\n\t    \t\t";
if(runtime.contextOrFrameLookup(context, frame, "currentMode") == runtime.memberLookup((t_4),"id", env.autoesc)) {
output += "selected=\"yes\"";
}
output += "\n\t    \t>";
output += runtime.suppressValue(runtime.memberLookup((t_4),"title", env.autoesc), env.autoesc);
output += "</option>\n\t    ";
}
}frame = frame.pop();
output += "\n    </select></div>\n\n    ";
if(runtime.memberLookup((runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "modes")),runtime.contextOrFrameLookup(context, frame, "currentModeIndex"), env.autoesc)),"target", env.autoesc)) {
output += "\n    <div><select data-vdev=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "\" data-command=\"setTarget\" class=\"widgetModeTargetSelector\">\n\t    ";
frame = frame.push();
var t_6 = runtime.contextOrFrameLookup(context, frame, "possibleTargets");
if(t_6) {for(var t_5=0; t_5 < t_6.length; t_5++) {
var t_7 = t_6[t_5];
frame.set("t", t_7);
output += "\n\t    \t<option value=\"";
output += runtime.suppressValue(t_7, env.autoesc);
output += "\"\n\t    \t\t";
if(runtime.memberLookup((runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "modes")),runtime.contextOrFrameLookup(context, frame, "currentModeIndex"), env.autoesc)),"target", env.autoesc) == t_7) {
output += "selected=\"yes\"";
}
output += "\n\t    \t>";
output += runtime.suppressValue(t_7, env.autoesc);
output += "</option>\n\t    ";
}
}frame = frame.pop();
output += "\n    </select></div>\n    ";
}
output += "\n";
return output;
} catch (e) {
  runtime.handleError(e, lineno, colno);
}
}
return {
b_content: b_content,
root: root
};

})();
if(typeof define === "function" && define.amd) {
    define(["nunjucks"], function(nunjucks) {
        nunjucks.env = new nunjucks.Environment([], null);
        nunjucks.env.registerPrecompiled(templates);
        return nunjucks;
    });
}
else if(typeof nunjucks === "object") {
    nunjucks.env = new nunjucks.Environment([], null);
    nunjucks.env.registerPrecompiled(templates);
}
else {
    console.error("ERROR: You must load nunjucks before the precompiled templates");
}
})();
