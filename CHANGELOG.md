# Release 1.0.1

* Removed `actions` and `metrics` properties from the `module.json` of all modules.

* Module classes automatically loaded to the controller. Removed `modules` property from the `config.json`.

* Introduced `skip` property to the `module.json` which instructs AutomationController to skip module class loading.

* Introduced `autoloadPriority` property to the `module.json` which determines automatic module instantiation order (lower -- the sooner).

* Introduced `caps` property to the Virtual Device which allows to list device capabilities.

* Widgets moved to the new CommonWidgets module. Creation and registering custom widgets made possible.

# Release 1.0.0

(initial)
