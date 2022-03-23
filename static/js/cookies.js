! function() {
    var lang = "it";
    document.getElementsByTagName("html").length > 0 && (lang = document.getElementsByTagName("html")[0].getAttribute("lang") || lang), lang = lang.substring(0, 2), window.cookieconsent_cookiename = "unibo_cookie_consent", window.cookieconsent_options = {
        path: "/",
        theme: "https://www.unibo.it/cookies/cookies.css",
        message: "Non viene fatto uso dei cookies per il profiling degli utenti né vengono utilizzati altri sistemi per il tracciamento degli utenti. I cookies di sessione sono utilizzati esclusivamente nella misura necessaria per consentire l'esplorazione sicura ed efficiente del sito web. La memorizzazione dei cookie di sessione nel browser è sotto il controllo dell'utente, mentre le informazioni relative ai cookie vengono conservate a lato server per non più della durata della sessione di log. Per ulteriori informazioni, consultare la pagina ",
        messageafter: '. Proseguendo la navigazione del sito o cliccando su "chiudi" acconsenti all\'uso dei cookie.',
        dismiss: "chiudi",
        learnMore: "l'informativa sulla privacy",
        link: "https://opencitations.net/policy",
        markup: ['<div class="cc_banner-wrapper {{containerClasses}}">', '<div class="cc_banner cc_container cc_container--open">', '<a href="javascript:void(0);" data-cc-event="click:dismiss" class="cc_btn cc_btn_accept_all">{{options.dismiss}}</a>', '<p class="cc_message">{{options.message}} <a data-cc-if="options.link" class="cc_more_info" href="{{options.link || "#null"}}">{{options.learnMore}}</a>{{options.messageafter}}</p>', "</div>", "</div>"]
    }, "en" == lang && ("/" == window.cookieconsent_options.path && (window.cookieconsent_cookiename = "unibo_cookie_consent_en"), window.cookieconsent_options.message = "No cookies are used to profile users nor are other user tracking systems implemented. So-called session (non-persistent) cookies are used exclusively to the extent this is necessary to enable secure, efficient browsing. Storage of session cookies in terminal equipment or browsers is under the user's control, whilst cookie-related information is stored server-side after HTTP sessions in the service logs for no longer than the duration of the session. For further information, please see the ", window.cookieconsent_options.messageafter = '. By continuing to browse the site, or by clicking on “close”, you consent to such usage.', window.cookieconsent_options.dismiss = "close", window.cookieconsent_options.learnMore = "privacy policy", window.cookieconsent_options.link = "https://opencitations.net/policy")
}(),
function() {
    if (!window.hasCookieConsent) {
        window.hasCookieConsent = !0;
        var OPTIONS_VARIABLE = "cookieconsent_options",
            OPTIONS_UPDATER = "update_cookieconsent_options",
            DISMISSED_COOKIE = window.cookieconsent_cookiename || "cookieconsent_dismissed",
            THEME_BUCKET_PATH = "//s3.amazonaws.com/cc.silktide.com/";
        if (!(document.cookie.indexOf(DISMISSED_COOKIE) > -1 || window.navigator && window.navigator.CookiesOK)) {
            "function" != typeof String.prototype.trim && (String.prototype.trim = function() {
                return this.replace(/^\s+|\s+$/g, "")
            });
            var Util = {
                    isArray: function(obj) {
                        var proto = Object.prototype.toString.call(obj);
                        return "[object Array]" == proto
                    },
                    isObject: function(obj) {
                        return "[object Object]" == Object.prototype.toString.call(obj)
                    },
                    each: function(arr, callback, context, force) {
                        if (Util.isObject(arr) && !force)
                            for (var key in arr) arr.hasOwnProperty(key) && callback.call(context, arr[key], key, arr);
                        else
                            for (var i = 0, ii = arr.length; ii > i; i++) callback.call(context, arr[i], i, arr)
                    },
                    merge: function(obj1, obj2) {
                        obj1 && Util.each(obj2, function(val, key) {
                            Util.isObject(val) && Util.isObject(obj1[key]) ? Util.merge(obj1[key], val) : obj1[key] = val
                        })
                    },
                    bind: function(func, context) {
                        return function() {
                            return func.apply(context, arguments)
                        }
                    },
                    queryObject: function(object, query) {
                        var queryPart, i = 0,
                            head = object;
                        for (query = query.split(".");
                            (queryPart = query[i++]) && head.hasOwnProperty(queryPart) && (head = head[queryPart]);)
                            if (i === query.length) return head;
                        return null
                    },
                    setCookie: function(name, value, expiryDays, domain, path) {
                        expiryDays = expiryDays || 365;
                        var exdate = new Date;
                        exdate.setDate(exdate.getDate() + expiryDays);
                        var cookie = [name + "=" + value, "expires=" + exdate.toUTCString(), "path=" + path || "/"];
                        domain && cookie.push("domain=" + domain), document.cookie = cookie.join(";")
                    },
                    addEventListener: function(el, event, eventListener) {
                        el.addEventListener ? el.addEventListener(event, eventListener) : el.attachEvent("on" + event, eventListener)
                    }
                },
                DomBuilder = function() {
                    var eventAttribute = "data-cc-event",
                        conditionAttribute = "data-cc-if",
                        addEventListener = function(el, event, eventListener) {
                            return Util.isArray(event) ? Util.each(event, function(ev) {
                                addEventListener(el, ev, eventListener)
                            }) : void(el.addEventListener ? el.addEventListener(event, eventListener) : el.attachEvent("on" + event, eventListener))
                        },
                        insertReplacements = function(htmlStr, scope) {
                            return htmlStr.replace(/\{\{(.*?)\}\}/g, function(_match, sub) {
                                for (var value, token, tokens = sub.split("||"); token = tokens.shift();) {
                                    if (token = token.trim(), '"' === token[0]) return token.slice(1, token.length - 1);
                                    if (value = Util.queryObject(scope, token)) return value
                                }
                                return ""
                            })
                        },
                        buildDom = function(htmlStr) {
                            var container = document.createElement("div");
                            return container.innerHTML = htmlStr, container.children[0]
                        },
                        applyToElementsWithAttribute = function(dom, attribute, func) {
                            var els = dom.parentNode.querySelectorAll("[" + attribute + "]");
                            Util.each(els, function(element) {
                                var attributeVal = element.getAttribute(attribute);
                                func(element, attributeVal)
                            }, window, !0)
                        },
                        applyEvents = function(dom, scope) {
                            applyToElementsWithAttribute(dom, eventAttribute, function(element, attributeVal) {
                                var parts = attributeVal.split(":"),
                                    listener = Util.queryObject(scope, parts[1]);
                                addEventListener(element, parts[0], Util.bind(listener, scope))
                            })
                        },
                        applyConditionals = function(dom, scope) {
                            applyToElementsWithAttribute(dom, conditionAttribute, function(element, attributeVal) {
                                var value = Util.queryObject(scope, attributeVal);
                                value || element.parentNode.removeChild(element)
                            })
                        };
                    return {
                        build: function(htmlStr, scope) {
                            Util.isArray(htmlStr) && (htmlStr = htmlStr.join("")), htmlStr = insertReplacements(htmlStr, scope);
                            var dom = buildDom(htmlStr);
                            return applyEvents(dom, scope), applyConditionals(dom, scope), dom
                        }
                    }
                }(),
                cookieconsent = {
                    options: {
                        message: "This website uses cookies to ensure you get the best experience on our website. ",
                        dismiss: "Got it!",
                        learnMore: "More info",
                        link: null,
                        target: "_self",
                        container: null,
                        theme: "light-floating",
                        domain: null,
                        path: "/",
                        expiryDays: 365,
                        markup: ['<div class="cc_banner-wrapper {{containerClasses}}">', '<div class="cc_banner cc_container cc_container--open">', '<a href="#null" data-cc-event="click:dismiss" target="_blank" class="cc_btn cc_btn_accept_all">{{options.dismiss}}</a>', '<p class="cc_message">{{options.message}} <a data-cc-if="options.link" target="{{ options.target }}" class="cc_more_info" href="{{options.link || "#null"}}">{{options.learnMore}}</a></p>', '<a class="cc_logo" target="_blank" href="http://silktide.com/cookieconsent">Cookie Consent plugin for the EU cookie law</a>', "</div>", "</div>"]
                    },
                    init: function() {
                        var options = window[OPTIONS_VARIABLE];
                        options && this.setOptions(options), this.setContainer(), this.options.theme ? this.loadTheme(this.render) : this.render()
                    },
                    setOptionsOnTheFly: function(options) {
                        this.setOptions(options), this.render()
                    },
                    setOptions: function(options) {
                        Util.merge(this.options, options)
                    },
                    setContainer: function() {
                        this.options.container ? this.container = document.querySelector(this.options.container) : this.container = document.body, this.containerClasses = "", navigator.appVersion.indexOf("MSIE 8") > -1 && (this.containerClasses += " cc_ie8")
                    },
                    loadTheme: function(callback) {
                        var theme = this.options.theme; - 1 === theme.indexOf(".css") && (theme = THEME_BUCKET_PATH + theme + ".css");
                        var link = document.createElement("link");
                        link.rel = "stylesheet", link.type = "text/css", link.href = theme;
                        var loaded = !1;
                        link.onload = Util.bind(function() {
                            !loaded && callback && (callback.call(this), loaded = !0)
                        }, this), document.getElementsByTagName("head")[0].appendChild(link)
                    },
                    render: function() {
                        this.element && this.element.parentNode && (this.element.parentNode.removeChild(this.element), delete this.element), this.element = DomBuilder.build(this.options.markup, this), this.container.firstChild ? this.container.insertBefore(this.element, this.container.firstChild) : this.container.appendChild(this.element)
                    },
                    dismiss: function(evt) {
                        evt.preventDefault && evt.preventDefault(), evt.returnValue = !1, this.setDismissedCookie(), this.container.removeChild(this.element)
                    },
                    setDismissedCookie: function() {
                        Util.setCookie(DISMISSED_COOKIE, "yes", this.options.expiryDays, this.options.domain, this.options.path)
                    }
                },
                initialized = !1,
                init = function() {
                    initialized || "complete" != document.readyState || (cookieconsent.init(), initialized = !0, window[OPTIONS_UPDATER] = Util.bind(cookieconsent.setOptionsOnTheFly, cookieconsent), cookieconsent.setDismissedCookie())
                };
            init(), Util.addEventListener(document, "readystatechange", init)
        }
    }
}();
