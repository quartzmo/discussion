(function() {

  var root = this;   // window
  var Discussion = root.Discussion = {};

  Discussion.firebase = new Firebase("https://discussion.firebaseio.com");

  Discussion.username = null;

  Discussion.authClient = new FirebaseAuthClient(Discussion.firebase, function(error, user) {
    if (error) {
      // an error occurred while attempting login
      console.log(error);
    } else if (user) {
      // user authenticated with Firebase
      Discussion.username = user.login;
      $(".comment-editor-submit").prop('disabled', false).attr('disabled', false);
      $(".login").hide();
      $(".logout").show();
    } else {
      Discussion.username = null;
      $(".comment-editor-submit").prop('disabled', true).attr('disabled', true);
      $(".logout").hide();
      $(".login").show();
    }
  });

  var commentTemplate = _.template(

    '<div class="view">                                                  ' +
    '    <div class="date">                                              ' +
    '        <%= new Date(created_at).toLocaleString() %>                ' +
    '        by <%= username %>                                          ' +
    '    </div>                                                          ' +
    '    <div class="body">                                              ' +
    '        <%= title %>                                                ' +
    '    </div>                                                          ' +
    '    <a class="edit-link" style="display: none;">edit</a>            ' +
    '</div>                                                              ' +
    '<div class="edit">                                                  ' +
    '    <div class="comment-editor">                                    ' +
    '        <div contenteditable="true">                                ' +
    '            <%= title %>                                            ' +
    '        </div>                                                      ' +
    '        <a class="comment-editor-submit btn btn-mini">Submit</a>    ' +
    '        <a class="comment-editor-cancel">cancel</a>                 ' +
    '        <a class="comment-destroy">delete</a>                    ' +
    '        <br style="clear: both;"/>                                  ' +
    '    </div>                                                          ' +
    '                                                                    ' +
    '</div>                                                              '
  );

  var topicTemplate = _.template(

    '<div id="comment-list"></div>                                    ' +
    '<div class="comment-editor">                                  ' +
    '    <div contenteditable="true"></div>                        ' +
    '    <a class="comment-editor-submit btn btn-small">Post</a>   ' +
    '    <a class="login pull-right">Sign in</a>   ' +
    '    <a class="logout pull-right">Sign out</a>   ' +
    '    <br style="clear: both;"/>                                ' +
    '</div>                                                        '
  );

  var Comment = Backbone.Model.extend({

    validate: function() {
      if (this.get('title').length == 0) {
        return "Comment title cannot be empty.";
      }
    }

  });

  Discussion.CommentList = Backbone.Firebase.Collection.extend({

    model: Comment,

    firebase: Discussion.firebase,

    comparator: 'created_at'

  });

  var CommentView = Backbone.View.extend({

    tagName:  "div",
    className:  "comment",

    template: commentTemplate,

    events: {
      "click .edit-link"  : "edit",
      "click a.comment-destroy" : "destroy",
      "click a.comment-editor-submit"  : "update",
      "click a.comment-editor-cancel"  : "show"
    },

    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'remove', this.remove);
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.input = this.$('.edit .comment-editor div[contenteditable="true"]');
      if (this.model.get("username") === Discussion.username) {
        this.$(".edit-link").show();
      }
      return this;
    },

    edit: function() {
      this.$el.addClass("editing");
      this.input.focus();
    },

    show: function() {
      this.$el.removeClass("editing");
      this.render(); // restore initial value to contenteditable
    },

    update: function() {
      var value = this.input.html();
      this.model.set({title: value});
      this.show();
    },

    destroy: function() {
      this.collection.remove(this.model);
    }

  });

  Discussion.Topic = Backbone.View.extend({

    template: topicTemplate,

    events: {
      "click .comment-editor-submit":  "create"
    },

    initialize: function() {

      this.$el.html(this.template());

      this.input = this.$('.comment-editor div[contenteditable="true"]');

      this.listenTo(this.collection, 'add', this.addOne);
      this.listenTo(this.collection, 'reset', this.addAll);
      this.listenTo(this.collection, 'all', this.render);
      this.collection.fetch();
    },

    addOne: function(comment) {
      var view = new CommentView({model: comment, collection: this.collection});
      this.$("#comment-list").append(view.render().el);
    },

    addAll: function() {
      this.collection.each(this.addOne, this);
    },

    create: function() {
      var model = new Comment({title: this.input.html()});
      if (model.isValid()) {
        this.collection.add({title: this.input.html(), username: Discussion.username, created_at: new Date().toString()});      // add should accept 'model'
        this.input.html('');
      }
    }


  });

  Discussion.topics = [];

}).call(this);

(function(){
  jQuery.fn.discussion = function() {
    Discussion.topics.push(new Discussion.Topic({
      el: this,
      collection: new Discussion.CommentList
    }));
  };

}).call(jQuery);

$(function(){
  $(".comments").discussion();
  $(".comment-editor-submit").prop('disabled', true).attr('disabled', true);

  $(".logout").click(function(){
    return Discussion.authClient.logout();
  });

  $(".login").click(function(){
    var provider = "github";
    return Discussion.authClient.login(provider, {
      rememberMe: true
    });
  })
});
