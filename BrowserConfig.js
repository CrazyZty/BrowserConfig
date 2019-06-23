// ==UserScript==
// @name         浏览器配置器
// @namespace    ztyScript
// @version      0.1
// @description  根据用户自定义的配置信息，将特定网站进行重定向或者附加警告提示以给予用户提示。
// @author       sirzty
// @match        *
// @include      *
// @run-at       document-body
// @noframes
// @resource     browserConfig {线上配置文件所在地址，推荐使用线上地址 tampermonkey 会进行缓存，也可使用本地地址，线上地址示例：http://www.google.com/BrowserConfig.txt，本地地址示例：file://D:\BrowserConfig\BrowserConfig.txt}
// @grant        unsafeWindow
// @grant        GM_getResourceText
// ==/UserScript==

(function() {
    'use strict';
    var browserConfigText = GM_getResourceText("browserConfig");
    if (browserConfigText == null) {
        console.log("不存在线上浏览器配置文件");
        return;
    }
    var browserConfig = JSON.parse(browserConfigText);
    var webPageConfig = browserConfig.webPage;
    var timeConfig = browserConfig.time;

    var windowsSystem = "windows";
    var macSystem = "mac";
    var currentSystem = "unknown";
    var platform = navigator.platform;
    if(platform.indexOf("Win") == 0){
        currentSystem = windowsSystem;
    } else if(platform.indexOf("Mac") == 0){
        currentSystem = macSystem;
    }

    // 校验系统适用性，比如某些规则只在特定系统上生效
    var checkRuleSystemApplicable = function(checkRule, defaultConfig) {
        var applicableSystem = getConfigData(checkRule, defaultConfig, "applicableSystem");
        // 为空默认全部系统适用
        if (applicableSystem == null) {
            return true;
        }
        return applicableSystem == currentSystem;
    }

    // 页面重定向
    var redirect = function(redirecUrl) {
        window.location.href = redirecUrl;
    }

    // 校验 host 是否和当前网页地址匹配
    var checkHost = function(hosts) {
        if (hosts == null) {
            return null;
        }
        return hosts.find(function(host) {
            return window.location.host.includes(host);
        })
    }

    // 校验 hostRegex 是否和当前网页地址匹配
    var checkHostRegex = function(hostsRegexps) {
        if (hostsRegexps == null) {
            return null;
        }
        return hostsRegexps.find(function(hostRegex) {
            return window.location.host.search(new RegExp(hostRegex, "g")) >= 0;
        })
    }

    // 校验当前网页是否有特定关键词
    var checkKeyword = function(keywords) {
        if (keywords == null) {
            return null;
        }
        return keywords.find(function(keyword) {
            return document.title.includes(keyword);
        })
    }

    var getConfigData = function(checkRule, defaultConfig, configName) {
        if(checkRule != null && checkRule.config!= null) {
            var configData = checkRule.config[configName];
            if (configData != null ) {
                return configData;
            }
        }
        return defaultConfig[configName];
    }

    var handleConfig = function(config, checkRule) {
        var rules = config.rules;
        var defaultConfig = config.defaultConfig;
        Object.keys(rules).forEach(function(key){
            var checkingRule = rules[key]
            if(!checkRuleSystemApplicable(checkRule, defaultConfig)) {
                return;
            }
            return checkRule(checkingRule, defaultConfig);
        });
    }

    var handleForbiddenWebPage = function(forbiddenWebPage) {
        handleConfig(forbiddenWebPage, function(checkRule, defaultConfig){
            var checkResult = checkHost(checkRule.hosts);
            if (checkResult == null) {
                checkResult = checkHostRegex(checkRule.hostRegexps);
            }
            if (checkResult == null) {
                checkResult = checkKeyword(checkRule.keywords);
            }
            if (checkResult != null) {
                redirect(getConfigData(checkRule, defaultConfig, "redirectUrl"));
            }
        });
    }

    var handlelimitedWebPage = function(limitedWebPage) {
        handleConfig(limitedWebPage, function(checkRule, defaultConfig){
            var checkResult = checkHost(checkRule.hosts);
            if (checkResult == null) {
                checkResult = checkHostRegex(checkRule.hostRegexps);
            }
            if (checkResult == null) {
                checkResult = checkKeyword(checkRule.keywords);
            }
            if (checkResult != null) {
                var availableTime = getConfigData(checkRule, defaultConfig, "availableTime");
                if (availableTime !=null && availableTime == new Date().getDay()) {
                    console.log(getConfigData(checkRule, defaultConfig, "availableTimeAlert"));
                    return;
                }
                redirect(getConfigData(checkRule, defaultConfig, "redirectUrl"));
            }
        });
    }

    var handleTime = function(timeConfig) {
        handleConfig(timeConfig, function(checkRule, defaultConfig){
            var beginTime = checkRule.beginTime.split(":");
            var endTime = checkRule.endTime.split(":");
            var beginTimeHour = beginTime[0];
            var beginTimeMinute = beginTime[1];
            var endTimeHour = endTime[0];
            var endTimeMinute = endTime[1];
            var date = new Date();
            var currentHour = date.getHours();
            var currentMinute = date.getMinutes();
            if ((currentHour < beginTimeHour) || (currentHour == beginTimeHour && currentMinute <= beginTimeMinute) ||
                (currentHour > endTimeHour) || (currentHour == endTimeHour && currentMinute >= endTimeMinute)) {
                window.alert(getConfigData(checkRule, defaultConfig, "alertMessage"));
            }
        });
    }

    handleForbiddenWebPage(webPageConfig.forbidden);
    handlelimitedWebPage(webPageConfig.limited);
    handleTime(timeConfig);
})();