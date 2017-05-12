RED.gitvcs = (function () {

    var deploymentType = "full";
    var commitAllowed = false;

    var resolveConflictFunction;

    var lastMergedRevision;

    function disableCommitButton() {
        $("#btn-commit").addClass("disabled");
        $("#btn-commit").css("cursor", "default");
        $("#btn-commit").css("background", "#444");
        $("#btn-commit").css("color", "#999");
    }

    function enableCommitButtonIfAllowed() {
        if (commitAllowed) {
            $("#btn-commit").removeClass("disabled");
            $("#btn-commit").css("cursor", "pointer");
            $("#btn-commit").css("background", "#8C101C");
            $("#btn-commit").css("color", "#eee");
            window.onbeforeunload = function() {
                return RED._("deploy.confirm.undeployedChanges");
            };
        }
    }

    function setAllowCommitMode() {
        commitAllowed = true;
    }

    function getAllowCommitMode() {
        return commitAllowed;
    }

    function setDisallowCommitMode() {
        commitAllowed = false;
    }

    function setLastMergedRevision(rev) {
        lastMergedRevision = rev;
        $.ajax({
            url: "/lastMergedRevision?" + (lastMergedRevision ? "lastMergedRevision=" + lastMergedRevision : ""),
            type: "POST"
        })
    }

    function commit() {
        if (!commitAllowed) {
            return;
        }
        var startTime = Date.now();
        $(".deploy-button-content").css('opacity',0);
        $(".deploy-button-spinner").show();

        var nns = RED.nodes.createCompleteNodeSet();
        $.ajax({
            url: "/repositoryflows?" + (lastMergedRevision ? "lastMergedRevision=" + lastMergedRevision : ""),
            type: "POST",
            data: JSON.stringify(nns),
            contentType: "application/json; charset=utf-8",
            headers: {
                "Node-RED-Deployment-Type": deploymentType
            }
        })
            .done(function () {
                RED.nodes.originalFlow(nns);
                lastMergedRevision = null;
                disableCommitButton();
                setDisallowCommitMode();
                window.onbeforeunload = null;
            })
            .fail(function (xhr, textStatus, err) {
                if (xhr.status === 409) {
                    sendSignalToReloadFlowFromGithub(function() {
                        if (resolveConflictFunction) resolveConflictFunction(nns);
                    });
                }
            }).always(function(){
                var delta = Math.max(0,300-(Date.now()-startTime));
                setTimeout(function() {
                    $(".deploy-button-content").css('opacity',1);
                    $(".deploy-button-spinner").hide();
                },delta);
            });
    }

    function sendSignalToReloadFlowFromGithub(callback) {
        $.ajax({
            url: "/repositorymode",
            type: "POST",
            // data: JSON.stringify(data),
            // contentType: "application/json; charset=utf-8",
            headers: {
                "Node-RED-Deployment-Type": deploymentType
            }
        }).done(function (data, textStatus, xhr) {
            callback();
        });
    }

    function init(resolveConflictFunc) {
        $('<span class="deploy-button-group button-group"><a id="btn-commit" class="deploy-button disabled" href="#">' +
            '<span class="deploy-button-content">Commit to Github</span>' +
            '<span class="deploy-button-spinner hide">' +
                '<img src="red/images/spin.svg"/>' +
            '</span>' +
            '</a></span>').prependTo(".header-toolbar");

        disableCommitButton();
        $('#btn-commit').click(commit);

        resolveConflictFunction = resolveConflictFunc;
    }

    return {
        init: init,
        //commit: commit,

        disableCommitButton: disableCommitButton,
        enableCommitButtonIfAllowed: enableCommitButtonIfAllowed,
        setAllowCommitMode: setAllowCommitMode,
        setLastMergedRevision: setLastMergedRevision,
        sendSignalToReloadFlowFromGithub: sendSignalToReloadFlowFromGithub
    }

})();
