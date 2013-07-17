(function() {
var templates = {};
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
var l_super = context.getSuper(env, "content", b_content, frame, runtime);
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
output += "\" data-command=\"full\"     class=\"widgetCommandButton btn\">Full</a>\n        <a href=\"#\" data-vdev=\"";
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
var l_super = context.getSuper(env, "content", b_content, frame, runtime);
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
templates["widgets/smallWidget.html"] = (function() {
function root(env, context, frame, runtime) {
var lineno = null;
var colno = null;
var output = "";
try {
output += "<div class=\"span4 smallWidget\">\n    <div class=\"well\">\n        <div class=\"pull-right\"><a href=\"#\" class=\"widgetCommandButton btn btn-mini refreshButton\" data-vdev=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "vDev"), env.autoesc);
output += "\" data-command=\"update\"><i class=\"icon-refresh\"></i></a></div>\n        ";
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
var l_super = context.getSuper(env, "content", b_content, frame, runtime);
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
var l_super = context.getSuper(env, "content", b_content, frame, runtime);
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
