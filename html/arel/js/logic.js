//arel.Debug.activate();

var methodExists = function (object, method) {
    return typeof object !== 'undefined' && typeof method === 'function';
};

arel.sceneReady(function() {

    var scenario = {};
    scenario.objectName = "scenario";
    scenario.contents = []; // Array of all contents in this AR scenario
    scenario.trackables = []; // Array of all trackables in this AR scenario
    scenario.googleAnalytics = null;
    scenario.currentSceneID = "1";
    scenario.currentTrackingConfigPathOrIdentifier = "html/resources/TrackingData.zip";

    scenario.addObject = function (object) {
        arel.Debug.log("scenario.addObject(" + object.objectName + ")");
        this.registerObject(object);
        arel.Scene.addObject(object);
    };

    scenario.registerObject = function (object) {
        arel.Debug.log("scenario.registerObject(" + object.objectName + ")");
        arel.Events.setListener(object, this.objectEventsCallback, scenario);
    };

    scenario.groupID = 0;
    scenario.getNewGroupID = function () {
        this.groupID++;
        return this.groupID;
    };

    scenario.getTrackable = function (identifier) {
        arel.Debug.log("scenario.getTrackable(" + identifier + ")");
        var i;
        var trackable = null;
        if (!identifier || identifier === "") {
            arel.Debug.log("scenario.getTrackable(): Warning - identifier is empty, returning null");
            return trackable;
        }
        var allTrackables = this.trackables;
        allTrackables.push("instantTracker");
        for (i = 0; i < allTrackables.length; ++i) {
            trackable = allTrackables[i];
            if (trackable.objectName == identifier) {
                return trackable;
            }
            if (trackable.cosName == identifier) {
                return trackable;
            }
            if (trackable.cosID == identifier) {
                return trackable;
            }
        }
        arel.Debug.log("scenario.getTrackable(" + identifier + "): Error - could not correlate the given identifier to any known trackable.");
        return null;
    };

    scenario.sceneCallback = function (type, result) {
        if (!type) {
            return;
        }
        switch (type) {
        case arel.Events.Scene.ONTRACKING:
            this.onTrackingChanged(result);
            break;
        case arel.Events.Scene.ONVISUALSEARCHRESULT:
            break;
        case arel.Events.Scene.ONLOAD:
        case arel.Events.Scene.ONLOCATIONUPDATE:
        case arel.Events.Scene.ONREADY:
        default:
            break;
        }
    };

    scenario.objectEventsCallback = function (object, type, params) {
        switch (type) {
        case arel.Events.Object.ONREADY:
            if (methodExists(object, object.onLoaded)) {
                object.onLoaded();
            }
            // As a new object has just been loaded we need to re-trigger switchScene() to make sure only
            // content of the current scene is displayed.
            this.switchScene(this.currentSceneID);
            break;
        case arel.Events.Object.ONTOUCHSTARTED:
            if (this.googleAnalytics) {
                this.googleAnalytics.logUIInteraction(arel.Plugin.Analytics.Action.TOUCHSTARTED, object.getID());
            }
            break;
        case arel.Events.Object.ONTOUCHENDED:
            if (this.googleAnalytics) {
                this.googleAnalytics.logUIInteraction(arel.Plugin.Analytics.Action.TOUCHENDED, object.getID());
            }
            break;
        case arel.Events.Object.ONINVISIBLE:
        case arel.Events.Object.ONVISIBLE:
        case arel.Events.Object.ONANIMATIONENDED:
        case arel.Events.Object.ONMOVIEENDED:
        case arel.Events.Object.ONLOAD:
        case arel.Events.Object.ONROTATED:
        case arel.Events.Object.ONSCALED:
        case arel.Events.Object.ONTRANSLATED:
        default:
            break;
        }
    };

    scenario.onTrackingChanged = function (trackingValuesList) {
        if (trackingValuesList.length === 0) {
            arel.Debug.log("scenario.onTrackingChanged: Error - list of tracking values is empty, this should be impossible.");
            return;
        }
        var i, trackingValues, cosName, cosID, trackable, trackingMethod, gaTrackingMethod;
        for (i = 0; i < trackingValuesList.length; i++) {
            trackingValues = trackingValuesList[i];
            trackable = null;
            cosName = trackingValues.getCoordinateSystemName();
            cosID = trackingValues.getCoordinateSystemID();
            // Try to find the trackable by its COS name first. If that fails, try the COS ID.
            if (cosName && cosName !== "") {
                trackable = this.getTrackable(cosName);
            }
            if (trackable === null && cosID) {
                trackable = this.getTrackable(cosID);
            }
            if (trackable === null) {
                arel.Debug.log("onTrackingChanged: Error - Can't find a trackable matching COS name '" + cosName + "' or COS ID '" + cosID + "'");
                return;
            }

            switch (trackingValues.getState()) {
            case arel.Tracking.STATE_NOTTRACKING:
                arel.Debug.log("onTrackingChanged: " + trackable.objectName + " is not tracking");
                if (methodExists(trackable, trackable.onTrackingLost)) {
                    trackable.onTrackingLost(trackingValues);
                }
                break;
            case arel.Tracking.STATE_TRACKING:
                arel.Debug.log("onTrackingChanged: " + trackable.objectName + " is tracking");
                if (methodExists(trackable, trackable.onDetected)) {
                    trackable.onDetected();
                }
                if (methodExists(trackable, trackable.onTracked)) {
                    trackable.onTracked(trackingValues);
                }
                if (this.googleAnalytics) {
                    trackingMethod  = trackingValues.getType();
                    gaTrackingMethod = this.googleAnalytics.trackingTypeToAnalyticsType(trackingMethod);
                    this.googleAnalytics.logTrackingEvent(gaTrackingMethod, arel.Plugin.Analytics.Action.STATE_TRACKING, cosID, cosName);
                }
                break;
            case arel.Tracking.STATE_EXTRAPOLATED:
            case arel.Tracking.STATE_INITIALIZED:
            case arel.Tracking.STATE_REGISTERED:
            default:
                break;
            }
        }
    };

    scenario.showInstantTrackingContents = function () {
        arel.Debug.log("scenario.showInstantTrackingContents()");
        var i, content;
        for (i = 0; i < this.contents.length; ++i) {
            content = this.contents[i];
            if (!content.isModel3D || content.isShownOnTheUserDevice) {
                continue;
            }
            if (content.isShownOnTheInstantTracker) {
                if (methodExists(content, content.display)) {
                    content.display();
                }
            } else {
                if (methodExists(content, content.hide)) {
                    content.hide();
                }
            }
        }
    };

    scenario.hideInstantTrackingContents = function (displayNonInstantTrackingContents) {
        arel.Debug.log("scenario.hideInstantTrackingContents()");
        var i, content;
        for (i = 0; i < this.contents.length; ++i) {
            content = this.contents[i];
            if (!content.isModel3D || content.isShownOnTheUserDevice) {
                continue;
            }
            if (content.isShownOnTheInstantTracker) {
                if (methodExists(content, content.hide)) {
                    content.hide();
                }
            } else if (displayNonInstantTrackingContents) {
                if (methodExists(content, content.display)) {
                    content.display();
                }
            }
        }
    };

    scenario.startInstantTracking = function () {
        arel.Debug.log("scenario.startInstantTracking()");
        this.showInstantTrackingContents();
        arel.Scene.startInstantTracking(arel.Tracking.INSTANT2D);
        if (methodExists(this, this.onStartInstantTracking)) {
            this.onStartInstantTracking();
        }
    };

    scenario.stopInstantTracking = function () {
        arel.Debug.log("scenario.stopInstantTracking()");
        this.hideInstantTrackingContents(true);
        arel.Scene.setTrackingConfiguration(this.currentTrackingConfigPathOrIdentifier);
        if (methodExists(this, this.onStopInstantTracking)) {
            this.onStopInstantTracking();
        }
    };

    scenario.switchScene = function (newSceneID) {
        arel.Debug.log("scenario.switchScene(" + newSceneID + ")");
        if (newSceneID) {
            var sceneExists = false;
            var i, content;
            for (i = 0; i < this.contents.length; ++i) {
                content = this.contents[i];
                if (content.sceneID == newSceneID) {
                    sceneExists = true;
                    break;
                }
            }
            if (!sceneExists) {
                arel.Debug.log("scenario.switchScene(): Error - No scene with ID " + newSceneID + " exists.");
                return;
            }
        }

        this.currentSceneID = newSceneID;

        for (i = 0; i < this.contents.length; ++i) {
            content = this.contents[i];
            // Skip contents which aren't 3D models or which have been explicitly set invisible.
            if (!content.isModel3D || content.isExplicitlyInvisible) {
                continue;
            }
            // Display this content if it is part of the current scene, if no current scene is set at all or the content has no scene.
            if (content.sceneID == this.currentSceneID || !this.currentSceneID || !content.sceneID) {
                if (methodExists(content, content.display)) {
                    content.display(true);
                }
            } else {
                if (methodExists(content, content.hide)) {
                    content.hide(true);
                }
            }
        }

        // Iterate over all trackables, simulate an onDetected() and onTracked() event for all those which are currently tracking.
        var trackable;
        for (i = 0; i < this.trackables.length; ++i) {
            trackable = this.trackables[i];
            if (trackable.isCurrentlyTracking) {
                if (methodExists(trackable, trackable.onDetected)) {
                    trackable.onDetected();
                }
                if (methodExists(trackable, trackable.onTracked)) {
                    trackable.onTracked(trackable.currentTrackingValues);
                }
            }
        }

        if (methodExists(this, this.onSwitchScene)) {
            this.onSwitchScene(this.currentSceneID);
        }
    };

    scenario.skipTrackingInitialization = function () {
        arel.Debug.log("scenario.skipTrackingInitialization()");
        arel.Scene.sensorCommand("initialize", "", function(a) {});
        if (methodExists(this, this.onSkipTrackingInitialization)) {
            this.onSkipTrackingInitialization();
        }
    };

    scenario.reloadTrackingConfiguration = function () {
        arel.Debug.log("scenario.reloadTrackingConfiguration()");
        arel.Scene.setTrackingConfiguration(this.currentTrackingConfigPathOrIdentifier);
        if (methodExists(this, this.onReloadTrackingConfiguration)) {
            this.onReloadTrackingConfiguration();
        }
    };

    scenario.onStartup = function () {
        arel.Debug.log("Welcome to the 'castello' Augmented Reality experience.");

        arel.Events.setListener(arel.Scene, scenario.sceneCallback, scenario);

        if (google_analytics_id) {
            arel.Debug.log("Google Analytics is enabled. Your account ID is: " + google_analytics_id);
            arel.Debug.log("The event sampling rate is: arel.Plugin.Analytics.EventSampling.ONCE");
            scenario.googleAnalytics = new arel.Plugin.Analytics(google_analytics_id, arel.Plugin.Analytics.EventSampling.ONCE, "castle");
        } else {
            arel.Debug.log("Note: No Google Analytics ID is set - Google Analytics will be disabled.");
        }

        if (methodExists(scenario, scenario.onLoaded)) {
            scenario.onLoaded();
        }

        // The following contents have been defined in the index.xml file, therefore we need to register them
        // and call their onLoaded() event manually.
        scenario.registerObject(image1);
        if (methodExists(image1, image1.onLoaded)) {
            image1.onLoaded();
        }
        scenario.registerObject(image2);
        if (methodExists(image2, image2.onLoaded)) {
            image2.onLoaded();
        }
        scenario.registerObject(image3);
        if (methodExists(image3, image3.onLoaded)) {
            image3.onLoaded();
        }
        scenario.registerObject(image4);
        if (methodExists(image4, image4.onLoaded)) {
            image4.onLoaded();
        }

        scenario.hideInstantTrackingContents();

        if (methodExists(userDevice, userDevice.onLoaded)) {
            userDevice.onLoaded();
        }

        // All objects have been defined, so start the AR experience by calling each trackable's .onLoaded() method.
        var i, trackable;
        for (i = 0; i < scenario.trackables.length; ++i) {
            trackable = scenario.trackables[i];
            if (methodExists(trackable, trackable.onLoaded)) {
                trackable.onLoaded();
            }
        }
        // Call switchScene() once with the inital scene ID to make sure only content of that scene is visible.
        this.switchScene(this.currentSceneID);
    };


    // square01
    var image1 = arel.Scene.getObject("image1");
    image1.objectName = "image1";
    image1.sceneID = "1";
    image1.isModel3D = true;
    image1.isExplicitlyInvisible = false;
    image1.isShownOnTheUserDevice = false;
    image1.isShownOnTheInstantTracker = false;
    scenario.contents.push(image1);

    image1.setSceneID = function (sceneID) {
        this.sceneID = sceneID;
        scenario.switchScene(scenario.currentSceneID);
    };

    image1.isLoaded = function () {
        return arel.Scene.objectExists("image1");
    };

    image1.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image1.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image1.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image1.display = function (internalCall) {
        arel.Debug.log(this.objectName + ".display()");
        if (this.sceneID != scenario.currentSceneID) {
            return;
        }
        this.setVisibility(true);
        if (!internalCall) {
            this.isExplicitlyInvisible = false;
        }
    };

    image1.hide = function (internalCall) {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
        if (!internalCall) {
            this.isExplicitlyInvisible = true;
        }
    };

    image1.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image1);
            }
            arel.GestureHandler.addObject("image1", origin.groupID);
            this.setPickingEnabled(false);
        }
    };


    // square02
    var image2 = arel.Scene.getObject("image2");
    image2.objectName = "image2";
    image2.sceneID = "1";
    image2.isModel3D = true;
    image2.isExplicitlyInvisible = false;
    image2.isShownOnTheUserDevice = false;
    image2.isShownOnTheInstantTracker = false;
    scenario.contents.push(image2);

    image2.setSceneID = function (sceneID) {
        this.sceneID = sceneID;
        scenario.switchScene(scenario.currentSceneID);
    };

    image2.isLoaded = function () {
        return arel.Scene.objectExists("image2");
    };

    image2.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image2.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image2.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image2.display = function (internalCall) {
        arel.Debug.log(this.objectName + ".display()");
        if (this.sceneID != scenario.currentSceneID) {
            return;
        }
        this.setVisibility(true);
        if (!internalCall) {
            this.isExplicitlyInvisible = false;
        }
    };

    image2.hide = function (internalCall) {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
        if (!internalCall) {
            this.isExplicitlyInvisible = true;
        }
    };

    image2.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image2);
            }
            arel.GestureHandler.addObject("image2", origin.groupID);
            this.setPickingEnabled(false);
        }
    };


    // square03
    var image3 = arel.Scene.getObject("image3");
    image3.objectName = "image3";
    image3.sceneID = "1";
    image3.isModel3D = true;
    image3.isExplicitlyInvisible = false;
    image3.isShownOnTheUserDevice = false;
    image3.isShownOnTheInstantTracker = false;
    scenario.contents.push(image3);

    image3.setSceneID = function (sceneID) {
        this.sceneID = sceneID;
        scenario.switchScene(scenario.currentSceneID);
    };

    image3.isLoaded = function () {
        return arel.Scene.objectExists("image3");
    };

    image3.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image3.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image3.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image3.display = function (internalCall) {
        arel.Debug.log(this.objectName + ".display()");
        if (this.sceneID != scenario.currentSceneID) {
            return;
        }
        this.setVisibility(true);
        if (!internalCall) {
            this.isExplicitlyInvisible = false;
        }
    };

    image3.hide = function (internalCall) {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
        if (!internalCall) {
            this.isExplicitlyInvisible = true;
        }
    };

    image3.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image3);
            }
            arel.GestureHandler.addObject("image3", origin.groupID);
            this.setPickingEnabled(false);
        }
    };


    // square04
    var image4 = arel.Scene.getObject("image4");
    image4.objectName = "image4";
    image4.sceneID = "1";
    image4.isModel3D = true;
    image4.isExplicitlyInvisible = false;
    image4.isShownOnTheUserDevice = false;
    image4.isShownOnTheInstantTracker = false;
    scenario.contents.push(image4);

    image4.setSceneID = function (sceneID) {
        this.sceneID = sceneID;
        scenario.switchScene(scenario.currentSceneID);
    };

    image4.isLoaded = function () {
        return arel.Scene.objectExists("image4");
    };

    image4.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image4.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image4.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image4.display = function (internalCall) {
        arel.Debug.log(this.objectName + ".display()");
        if (this.sceneID != scenario.currentSceneID) {
            return;
        }
        this.setVisibility(true);
        if (!internalCall) {
            this.isExplicitlyInvisible = false;
        }
    };

    image4.hide = function (internalCall) {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
        if (!internalCall) {
            this.isExplicitlyInvisible = true;
        }
    };

    image4.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image4);
            }
            arel.GestureHandler.addObject("image4", origin.groupID);
            this.setPickingEnabled(false);
        }
    };


    var userDevice = {};
    userDevice.objectName = "userDevice";
    userDevice.cosName = "Device";
    userDevice.cosID = "-1";

    var instantTracker = {};
    scenario.trackables.push(instantTracker);
    instantTracker.objectName = "instantTracker";
    instantTracker.cosName = "InstantTracker";
    instantTracker.cosID = "1";
    instantTracker.isCurrentlyTracking = false;
    instantTracker.currentTrackingValues = null;

    var pattern1 = {};
    scenario.trackables.push(pattern1);
    pattern1.objectName = "pattern1";
    pattern1.cosName = "Bodiam Castle_1";
    pattern1.cosID = "1";
    pattern1.isCurrentlyTracking = false;
    pattern1.currentTrackingValues = null;
    pattern1.onUnloaded = function () {
        arel.Debug.log(this.objectName + ".onUnloaded()");
        image3.unload();
        image4.unload();
        image2.unload();
        image1.unload();
    };


    // Kick-off the AR experience by calling the scenario's onStartup() method as soon as AREL is ready
    scenario.onStartup();
});