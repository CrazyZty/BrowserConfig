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
    var checkRuleSystemApplicable = function(getConfigData) {
        var applicableSystems = getConfigData("applicableSystems");
        // 为空默认全部系统适用
        if (applicableSystems == null) {
            return true;
        }
        return applicableSystems.find(function(applicableSystem) {
            return applicableSystem == currentSystem;
        }) != null;
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

    // 从 Rule 的配置或默认配置中提取数据，优先从 Rule 中提取
    var analysisConfigData = function(rule, systemConfig, defaultConfig, configName) {
        var configData;
        if(rule != null && rule.config != null) {
            configData = rule.config[configName];
            if (configData != null ) {
                return configData;
            }
        }
        if(systemConfig != null) {
            configData = systemConfig[configName];
            if (configData != null ) {
                return configData;
            }
        }
        return defaultConfig[configName];
    }

    // 根据配置信息校验规则，会自动先进行系统可用性识别
    var checkRules = function(config, checkRule) {
        var rules = config.rules;
        var defaultConfig = config.defaultConfig;
        var systemConfig = null;
        if (config.applicableSystemConfig != null) {
            systemConfig = config.applicableSystemConfig[currentSystem];
        }
        Object.keys(rules).forEach(function(key){
            var rule = rules[key]
            var getConfigData = function(configName) {
                return analysisConfigData(rule, systemConfig, defaultConfig, configName);
            };
            if(!checkRuleSystemApplicable(getConfigData)) {
                return;
            }
            return checkRule(rule, getConfigData);
        });
    }

    // 检测当前页面是否匹配不可用 WebPage 页面配置
    var handleForbiddenWebPage = function(forbiddenWebPage) {
        checkRules(forbiddenWebPage, function(rule, getConfigData){
            var checkResult = checkHost(rule.hosts);
            if (checkResult == null) {
                checkResult = checkHostRegex(rule.hostRegexps);
            }
            if (checkResult == null) {
                checkResult = checkKeyword(rule.keywords);
            }
            if (checkResult != null) {
                redirect(getConfigData("redirectUrl"));
            }
        });
    }

    // 检测当前页面是否匹配受限 WebPage 页面配置
    var handlelimitedWebPage = function(limitedWebPage) {
        checkRules(limitedWebPage, function(rule, getConfigData){
            var checkResult = checkHost(rule.hosts);
            if (checkResult == null) {
                checkResult = checkHostRegex(rule.hostRegexps);
            }
            if (checkResult == null) {
                checkResult = checkKeyword(rule.keywords);
            }
            if (checkResult != null) {
                var availableTime = getConfigData("availableTime");
                if (availableTime !=null && availableTime == new Date().getDay()) {
                    console.log(getConfigData("availableTimeAlert"));
                    return;
                }
                redirect(getConfigData("redirectUrl"));
            }
        });
    }

    // 浏览器可用时间校验
    var handleTime = function(timeConfig) {
        checkRules(timeConfig, function(rule, getConfigData){
            var beginTime = rule.beginTime.split(":");
            var endTime = rule.endTime.split(":");
            var beginTimeHour = beginTime[0];
            var beginTimeMinute = beginTime[1];
            var endTimeHour = endTime[0];
            var endTimeMinute = endTime[1];
            var date = new Date();
            var currentHour = date.getHours();
            var currentMinute = date.getMinutes();
            if ((currentHour < beginTimeHour) || (currentHour == beginTimeHour && currentMinute <= beginTimeMinute) ||
                (currentHour > endTimeHour) || (currentHour == endTimeHour && currentMinute >= endTimeMinute)) {
                window.alert(getConfigData("alertMessage"));
            }
        });
    }

    handleForbiddenWebPage(webPageConfig.forbidden);
    handlelimitedWebPage(webPageConfig.limited);
    handleTime(timeConfig);
})();