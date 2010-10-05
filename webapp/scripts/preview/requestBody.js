/* See license.txt for terms of usage */

require.def("preview/requestBody", [
    "domplate/domplate",
    "i18n!nls/requestBody",
    "core/lib",
    "domplate/tabView"
],

function(Domplate, Strings, Lib, TabView) { with (Domplate) {

//*************************************************************************************************
// Request Body

/**
 * @domplate This object represents a template for request body that is displayed if a request
 * is expanded within the UI. It's content is composed from set of tabs that are dynamically
 * appended as necessary (depends on actual data).
 *
 * TODO: There should be an APIs allowing to register a new tab from other modules. The same
 * approach as within the Firebug Net panel should be used.
 *
 * There are currently following tabs built-in:
 * {@link HeadersTab}: request and response headers
 * {@link ParamsTab}: URL parameters
 * {@link SentDataTab}: posted data
 * {@link ResponseTab}: request response body
 * {@link CacheTab}: browser cache entry meta-data
 * {@link HtmlTab}: Preview for HTML responses
 */
function RequestBody() {}
RequestBody.prototype = domplate(
/** @lends RequestBody */
{
    render: function(parentNode, file)
    {
        // Crete tabView and append all necessary tabs.
        var tabView = new TabView("requestBody");
        tabView.appendTab(new HeadersTab(file));

        if (file.request.queryString && file.request.queryString.length)
            tabView.appendTab(new ParamsTab(file));

        if (file.request.postData)
            tabView.appendTab(new SentDataTab(file, file.request.method));

        if (file.response.content.size > 0)
            tabView.appendTab(new ResponseTab(file));

        //xxxHonza
        //if (file.request.cookies || file.response.cookies)
        //    tabView.appendTab(new CookiesTab(file));

        if (this.showCache(file))
            tabView.appendTab(new CacheTab(file));

        if (this.showHtml(file))
            tabView.appendTab(new HtmlTab(file));

        // Finally, render the tabView, select the Headers tab by default and return
        // the root element (tabView).
        var element = tabView.render(parentNode);
        tabView.selectTabByName("Headers");
        return element;
    },

    showCache: function(file)
    {
        if (!file.cache)
            return false;

        if (!file.cache.afterRequest)
            return false;

        // Don't show cache tab for images 
        // xxxHonza: the tab could display the image. 
        if (file.category == "image")
            return false;

        return true;
    },

    showHtml: function(file)
    {
        return (file.response.content.mimeType == "text/html") ||
            (file.mimeType == "application/xhtml+xml");
    }
});

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

function HeadersTab(file)
{
    this.file = file;
}

HeadersTab.prototype = domplate(TabView.Tab.prototype,
{
    id: "Headers",
    label: Strings.Headers,

    bodyTag:
        TABLE({"class": "netInfoHeadersText netInfoText netInfoHeadersTable",
                cellpadding: 0, cellspacing: 0},
            TBODY(
                TR({"class": "netInfoResponseHeadersTitle"},
                    TD({colspan: 2},
                        DIV({"class": "netInfoHeadersGroup"}, Strings.ResponseHeaders)
                    )
                ),
                TR({"class": "netInfoRequestHeadersTitle"},
                    TD({colspan: 2},
                        DIV({"class": "netInfoHeadersGroup"}, Strings.RequestHeaders)
                    )
                )
            )
        ),

    headerDataTag:
        FOR("param", "$headers",
            TR(
                TD({"class": "netInfoParamName"}, "$param.name"),
                TD({"class": "netInfoParamValue"},
                    PRE("$param|getParamValue")
                )
            )
        ),

    getParamValue: function(param)
    {
        // This value is inserted into PRE element and so, make sure the HTML isn't escaped (1210).
        // This is why the second parameter is true.
        // The PRE element preserves whitespaces so they are displayed the same, as they come from
        // the server (1194).
        return Lib.wrapText(param.value, true);
    },

    onUpdateBody: function(tabView, body)
    {
        if (this.file.response.headers)
            this.insertHeaderRows(body, this.file.response.headers, "Headers", "ResponseHeaders");

        if (this.file.request.headers)
            this.insertHeaderRows(body, this.file.request.headers, "Headers", "RequestHeaders");
    },

    insertHeaderRows: function(parentNode, headers, tableName, rowName)
    {
        var headersTable = Lib.getElementByClass(parentNode, "netInfo"+tableName+"Table");
        var tbody = headersTable.firstChild;
        var titleRow = Lib.getChildByClass(tbody, "netInfo" + rowName + "Title");

        if (headers.length)
        {
            this.headerDataTag.insertRows({headers: headers}, titleRow ? titleRow : tbody);
            Lib.removeClass(titleRow, "collapsed");
        }
        else
        {
            Lib.setClass(titleRow, "collapsed");
        }
    }
});

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

function ResponseTab(file)
{
    this.file = file;
}

ResponseTab.prototype = domplate(TabView.Tab.prototype,
{
    id: "Response",
    label: Strings.Response,

    bodyTag:
        DIV({"class": "netInfoResponseText netInfoText"},
            DIV({"class": "loadResponseMessage"})
        ),

    onUpdateBody: function(tabView, body)
    {
        var responseTextBox = Lib.getElementByClass(body, "netInfoResponseText");
        Lib.clearNode(responseTextBox);

        if (this.file.category == "image")
        {
            var responseImage = body.ownerDocument.createElement("img");
            responseImage.src = this.file.href;

            responseTextBox.appendChild(responseImage, responseTextBox);
        }
        else
        {
            var text = this.file.response.content.text;
            Lib.insertWrappedText(text, responseTextBox);
        }
    }
});

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

function ParamsTab(file)
{
    this.file = file;
}

ParamsTab.prototype = domplate(HeadersTab.prototype,
{
    id: "Params",
    label: Strings.URLParameters,

    bodyTag:
        TABLE({"class": "netInfoParamsText netInfoText netInfoParamsTable",
            cellpadding: 0, cellspacing: 0}, TBODY()
        ),

    onUpdateBody: function(tabView, body)
    {
        if (this.file.request.queryString)
        {
            var textBox = Lib.getElementByClass(body, "netInfoParamsText");
            this.insertHeaderRows(textBox, this.file.request.queryString, "Params");
        }
    }
});

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

function SentDataTab(file, method)
{
    // Convert to lower case and capitalize the first letter.
    method = method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();

    this.file = file;
    this.id =  method;
    this.label = Strings[method];
}

SentDataTab.prototype = domplate(HeadersTab.prototype,
{
    bodyTag:
        DIV({"class": "netInfo$tab.id\\Text netInfoText"},
            TABLE({"class": "netInfo$tab.id\\Table", cellpadding: 0, cellspacing: 0},
                TBODY()
            )
        ),

    onUpdateBody: function(tabView, body)
    {
        var postData = this.file.request.postData;
        if (!postData)
            return;

        var textBox = Lib.getElementByClass(body, "netInfo" + this.id + "Text");
        if (postData.mimeType == "application/x-www-form-urlencoded")
            this.insertHeaderRows(textBox, postData.params, this.id);
        else
            Lib.insertWrappedText(postData.text, textBox);
    }
});

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

function CookiesTab(file)
{
    this.file = file;
}

CookiesTab.prototype = domplate(HeadersTab.prototype,
{
    id: "Cookies",
    label: Strings.Cookies,

    bodyTag:
        DIV({"class": "netInfoCookiesText netInfoText"},
            TABLE({"class": "netInfoCookiesTable", cellpadding: 0, cellspacing: 0},
                TBODY(
                    TR({"class": "netInfoResponseCookiesTitle"},
                        TD({colspan: 2},
                            DIV({"class": "netInfoCookiesGroup"}, Strings.ResponseCookies)
                        )
                    ),
                    TR({"class": "netInfoRequestCookiesTitle"},
                        TD({colspan: 2},
                            DIV({"class": "netInfoCookiesGroup"}, Strings.RequestCookies)
                        )
                    )
                )
            )
        ),

    onUpdateBody: function(tabView, body)
    {
        if (file.response.cookies)
        {
            var textBox = Lib.getElementByClass(body, "netInfoParamsText");
            this.insertHeaderRows(textBox, file.response.cookies, "Cookies", "ResponseCookies");
        }

        if (file.request.cookies)
        {
            var textBox = Lib.getElementByClass(body, "netInfoParamsText");
            this.insertHeaderRows(textBox, file.request.cookies, "Cookies", "RequestCookies");
        }
    }
});

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

function CacheTab(file)
{
    this.file = file;
}

CacheTab.prototype = domplate(HeadersTab.prototype,
{
    id: "Cache",
    label: Strings.Cache,

    bodyTag:
        DIV({"class": "netInfoCacheText netInfoText"},
            TABLE({"class": "netInfoCacheTable", cellpadding: 0, cellspacing: 0},
                TBODY()
            )
        ),

    onUpdateBody: function(tabView, body)
    {
        if (this.file.cache && this.file.cache.afterRequest)
        {
            var cacheEntry = this.file.cache.afterRequest;

            var values = [];
            for (var prop in cacheEntry)
                values.push({name: prop, value: cacheEntry[prop]});

            this.insertHeaderRows(body, values, "Cache");
        }
    }
});

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

/**
 * @domplate Represents an HTML preview for network responses using 'text/html' or 
 * 'application/xhtml+xml' mime type.
 */
function HtmlTab(file)
/** @lends HtmlTab */
{
    this.file = file;
}

HtmlTab.prototype = domplate(HeadersTab.prototype,
{
    id: "HTML",
    label: Strings.HTML,

    bodyTag:
        DIV({"class": "netInfoHtmlText netInfoText"},
            IFRAME({"class": "netInfoHtmlPreview"})
        ),

    onUpdateBody: function(tabView, body)
    {
        var iframe = Lib.getElementByClass(body, "netInfoHtmlPreview");
        iframe.contentWindow.document.body.innerHTML = this.file.response.content.text;
    }
});

//*************************************************************************************************

return RequestBody;

//*************************************************************************************************
}});